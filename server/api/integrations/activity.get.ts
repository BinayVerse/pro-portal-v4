import { query } from '../../utils/db'
import { CustomError } from '../../utils/custom.error'
import jwt from 'jsonwebtoken'
import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc.js'

dayjs.extend(utc)

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const token = event.node.req.headers['authorization']?.split(' ')[1]

  if (!token) {
    setResponseStatus(event, 401)
    throw new CustomError('Unauthorized: No token provided', 401)
  }

  let userId
  try {
    const decodedToken = jwt.verify(token, config.jwtToken as string)
    userId = (decodedToken as { user_id: string }).user_id
  } catch {
    setResponseStatus(event, 401)
    throw new CustomError('Unauthorized: Invalid token', 401)
  }

  try {
    // Get user's organization
    const userOrg = await query('SELECT org_id FROM users WHERE user_id = $1', [userId])
    if (!userOrg?.rows?.length) {
      setResponseStatus(event, 404)
      throw new CustomError('User not found or organization not assigned', 404)
    }

    const orgId = userOrg.rows[0].org_id

    // Time window: last 24 hours (UTC)
    const windowStart = dayjs().utc().subtract(24, 'hour').toISOString()

    // Slack integration events
    const slackRows = (await query(
      `SELECT status, updated_at FROM slack_team_mappings WHERE org_id = $1 AND updated_at >= $2 ORDER BY updated_at DESC LIMIT 5`,
      [orgId, windowStart]
    )).rows || []

    // Teams integration events
    const teamsRows = (await query(
      `SELECT status, updated_at FROM teams_tenant_mappings WHERE org_id = $1 AND updated_at >= $2 ORDER BY updated_at DESC LIMIT 5`,
      [orgId, windowStart]
    )).rows || []

    // WhatsApp events
    const waRows = (await query(
      `SELECT whatsapp_status, updated_at FROM meta_app_details WHERE org_id = $1 AND updated_at >= $2 ORDER BY updated_at DESC LIMIT 5`,
      [orgId, windowStart]
    )).rows || []

    // User-sync events (auto provisioned users)
    const userSyncRows = (await query(
      `SELECT name, email, added_by, created_at FROM users WHERE org_id = $1 AND added_by IN ('slack_auto_provision', 'teams_auto_provision') AND created_at >= $2 ORDER BY created_at DESC LIMIT 10`,
      [orgId, windowStart]
    )).rows || []

    // Token usage events
    const tokenUsageRow = (await query(
      `SELECT COUNT(*)::int AS messages, MAX(created_at) AS last_time FROM token_cost_calculation WHERE org_id = $1 AND created_at >= $2`,
      [orgId, windowStart]
    )).rows?.[0] || { messages: 0, last_time: null }

    const activities: any[] = []
    // Map slack
    for (const r of slackRows) {
      const ts = r.updated_at ? new Date(r.updated_at) : new Date()
      const status = r.status || ''
      activities.push({
        id: `slack-${ts.getTime()}`,
        type: status === 'active' ? 'success' : 'warning',
        message: `Slack integration ${status === 'active' ? 'connected' : 'disconnected'}`,
        time: ts.toISOString(),
        timestamp: ts,
      })
    }

    // Map teams
    for (const r of teamsRows) {
      const ts = r.updated_at ? new Date(r.updated_at) : new Date()
      const status = r.status || ''
      activities.push({
        id: `teams-${ts.getTime()}`,
        type: status === 'active' ? 'success' : 'warning',
        message: `Teams integration ${status === 'active' ? 'connected' : 'disconnected'}`,
        time: ts.toISOString(),
        timestamp: ts,
      })
    }

    // Map whatsapp
    for (const r of waRows) {
      const ts = r.updated_at ? new Date(r.updated_at) : new Date()
      const status = !!r.whatsapp_status
      activities.push({
        id: `whatsapp-${ts.getTime()}`,
        type: status ? 'success' : 'warning',
        message: `WhatsApp integration ${status ? 'connected' : 'disconnected'}`,
        time: ts.toISOString(),
        timestamp: ts,
      })
    }

    // Map user-sync (individual user additions)
    for (const r of userSyncRows) {
      const ts = r.created_at ? new Date(r.created_at) : new Date()
      const provider = r.added_by === 'slack_auto_provision' ? 'Slack' : 'Teams'
      const nameOrEmail = r.name || r.email || 'Unknown user'
      activities.push({
        id: `user-sync-${ts.getTime()}-${nameOrEmail}`,
        type: 'info',
        message: `${nameOrEmail} provisioned via ${provider}`,
        time: ts.toISOString(),
        timestamp: ts,
      })
    }

    // Token usage aggregated
    if (tokenUsageRow && parseInt(tokenUsageRow.messages) > 0) {
      const ts = tokenUsageRow.last_time ? new Date(tokenUsageRow.last_time) : new Date()
      activities.push({
        id: `token-usage-${ts.getTime()}`,
        type: 'info',
        message: `${tokenUsageRow.messages} messages processed`,
        time: ts.toISOString(),
        timestamp: ts,
      })
    }

    // Sort and limit to max 5
    const sorted = activities.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()).slice(0, 5)

    setResponseStatus(event, 200)
    return {
      statusCode: 200,
      status: 'success',
      data: {
        activities: sorted,
      },
      message: 'Recent activity fetched successfully'
    }

  } catch (error: any) {
    console.error('Integrations Activity Error:', error)

    if (error instanceof CustomError) {
      setResponseStatus(event, error.statusCode)
      return {
        statusCode: error.statusCode,
        status: 'error',
        message: error.message
      }
    }

    setResponseStatus(event, 500)
    return {
      statusCode: 500,
      status: 'error',
      message: 'Failed to fetch recent activity'
    }
  }
})

import { defineEventHandler, readBody, setResponseStatus } from 'h3'
import { query } from '../../utils/db'
import { CustomError } from '../../utils/custom.error'
import jwt from 'jsonwebtoken'
import {
  batchCreateOrganizationIntegrations,
  batchUpdateOrganizationIntegrations,
  batchDeleteOrganizationIntegrations,
  createIntegrationAuditLog,
} from '../../utils/dbHelpers'

interface BatchIntegration {
  providerId: string
  agentId: string
  moduleId: string
  clientId: string
  clientSecret?: string
  apiKey?: string
  accessToken?: string
  refreshToken?: string
  tokenExpiry?: string
  baseUrl?: string
  loginUrl?: string
  metadataJson?: Record<string, any>
  status?: 'active' | 'inactive' | 'expired' | 'failed'
  hrmsSystem?: string
  isHrms?: boolean
}

interface BatchUpdateIntegration {
  integrationId: string
  providerId: string
  clientId: string
  clientSecret?: string
  apiKey?: string
  accessToken?: string
  refreshToken?: string
  tokenExpiry?: string
  baseUrl?: string
  loginUrl?: string
  metadataJson?: Record<string, any>
  status?: 'active' | 'inactive' | 'expired' | 'failed'
  hrmsSystem?: string
  isHrms?: boolean
}

interface BatchRequest {
  action: 'create' | 'update' | 'delete'
  integrations?: BatchIntegration[]
  updates?: BatchUpdateIntegration[]
  integrationIds?: string[]
}

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const token = event.node.req.headers['authorization']?.split(' ')[1]

  if (!token) {
    setResponseStatus(event, 401)
    throw new CustomError('Unauthorized: No token provided', 401)
  }

  let userId: string
  try {
    const decodedToken = jwt.verify(token, config.jwtToken as string)
    userId = (decodedToken as { user_id: string }).user_id
  } catch {
    setResponseStatus(event, 401)
    throw new CustomError('Unauthorized: Invalid token', 401)
  }

  try {
    // Get user's organization
    const userOrgRow = await query('SELECT org_id FROM users WHERE user_id = $1', [userId])
    if (!userOrgRow?.rows?.length) {
      setResponseStatus(event, 404)
      throw new CustomError('User not found or organization not assigned', 404)
    }

    const orgId = userOrgRow.rows[0].org_id

    // Read request body
    const body: BatchRequest = await readBody(event)

    if (!body.action) {
      setResponseStatus(event, 400)
      throw new CustomError('Missing required field: action', 400)
    }

    if (body.action === 'create') {
      if (!body.integrations || body.integrations.length === 0) {
        setResponseStatus(event, 400)
        throw new CustomError('Missing integrations array for create action', 400)
      }

      // Validate each integration has required fields
      for (const integration of body.integrations) {
        if (!integration.providerId || !integration.agentId || !integration.moduleId || !integration.clientId) {
          setResponseStatus(event, 400)
          throw new CustomError('Missing required fields in integration: providerId, agentId, moduleId, clientId', 400)
        }
      }

      // Validate foreign key references for all integrations
      for (const integration of body.integrations) {
        const providerRes = await query('SELECT id FROM public.integration_providers WHERE id = $1', [
          integration.providerId,
        ])
        if (!providerRes.rowCount) {
          setResponseStatus(event, 404)
          throw new CustomError(`Provider not found: ${integration.providerId}`, 404)
        }

        const agentRes = await query('SELECT id FROM public.integration_agents WHERE id = $1', [integration.agentId])
        if (!agentRes.rowCount) {
          setResponseStatus(event, 404)
          throw new CustomError(`Agent not found: ${integration.agentId}`, 404)
        }

        const moduleRes = await query('SELECT id FROM public.integration_modules WHERE id = $1', [integration.moduleId])
        if (!moduleRes.rowCount) {
          setResponseStatus(event, 404)
          throw new CustomError(`Module not found: ${integration.moduleId}`, 404)
        }
      }

      // Create batch integrations
      const integrationDataList = body.integrations.map((integration) => ({
        providerId: integration.providerId,
        agentId: integration.agentId,
        moduleId: integration.moduleId,
        integrationData: {
          client_id: integration.clientId,
          client_secret: integration.clientSecret || null,
          api_key: integration.apiKey || null,
          access_token: integration.accessToken || null,
          refresh_token: integration.refreshToken || null,
          token_expiry: integration.tokenExpiry || null,
          base_url: integration.baseUrl || null,
          login_url: integration.loginUrl || null,
          metadata_json: integration.metadataJson || {},
          status: integration.status || 'active',
          hrms_system: integration.hrmsSystem,
          is_hrms: integration.isHrms,
        },
      }))

      const result = await batchCreateOrganizationIntegrations(orgId, integrationDataList)

      if (!result.success) {
        setResponseStatus(event, 500)
        throw new CustomError(result.error || 'Failed to create integrations', 500)
      }

      // Create audit logs for each created integration
      for (let i = 0; i < result.ids!.length; i++) {
        const integrationId = result.ids![i]
        const integrationData = integrationDataList[i].integrationData

        await createIntegrationAuditLog(integrationId, orgId, 'create', userId, event, undefined, integrationData)
      }

      setResponseStatus(event, 201)
      return {
        statusCode: 201,
        status: 'success',
        data: { ids: result.ids, count: result.ids!.length },
        message: `${result.ids!.length} organization integrations created successfully`,
      }
    } else if (body.action === 'update') {
      if (!body.updates || body.updates.length === 0) {
        setResponseStatus(event, 400)
        throw new CustomError('Missing updates array for update action', 400)
      }

      // Validate each update has required fields
      for (const update of body.updates) {
        if (!update.integrationId || !update.providerId || !update.clientId) {
          setResponseStatus(event, 400)
          throw new CustomError('Missing required fields in update: integrationId, providerId, clientId', 400)
        }
      }

      // Create batch updates
      const updateDataList = body.updates.map((update) => ({
        integrationId: update.integrationId,
        providerId: update.providerId,
        integrationData: {
          client_id: update.clientId,
          client_secret: update.clientSecret || null,
          api_key: update.apiKey || null,
          access_token: update.accessToken || null,
          refresh_token: update.refreshToken || null,
          token_expiry: update.tokenExpiry || null,
          base_url: update.baseUrl || null,
          login_url: update.loginUrl || null,
          metadata_json: update.metadataJson || {},
          status: update.status || 'active',
          hrms_system: update.hrmsSystem,
          is_hrms: update.isHrms,
        },
      }))

      const result = await batchUpdateOrganizationIntegrations(orgId, updateDataList)

      if (!result.success) {
        setResponseStatus(event, 500)
        throw new CustomError(result.error || 'Failed to update integrations', 500)
      }

      // Create audit logs for each updated integration
      for (const update of body.updates) {
        await createIntegrationAuditLog(update.integrationId, orgId, 'update', userId, event, undefined, update)
      }

      return {
        statusCode: 200,
        status: 'success',
        data: { count: body.updates.length },
        message: `${body.updates.length} organization integrations updated successfully`,
      }
    } else if (body.action === 'delete') {
      if (!body.integrationIds || body.integrationIds.length === 0) {
        setResponseStatus(event, 400)
        throw new CustomError('Missing integrationIds array for delete action', 400)
      }

      const result = await batchDeleteOrganizationIntegrations(orgId, body.integrationIds)

      if (!result.success) {
        setResponseStatus(event, 500)
        throw new CustomError(result.error || 'Failed to delete integrations', 500)
      }

      // Create audit logs for each deleted integration
      for (const integrationId of body.integrationIds) {
        await createIntegrationAuditLog(integrationId, orgId, 'delete', userId, event, undefined, {})
      }

      return {
        statusCode: 200,
        status: 'success',
        data: { count: body.integrationIds.length },
        message: `${body.integrationIds.length} organization integrations deleted successfully`,
      }
    } else {
      setResponseStatus(event, 400)
      throw new CustomError('Invalid action. Must be one of: create, update, delete', 400)
    }
  } catch (error: any) {
    console.error('Batch Organization Integration Error:', error)

    if (error instanceof CustomError) {
      setResponseStatus(event, error.statusCode)
      return {
        statusCode: error.statusCode,
        status: 'error',
        message: error.message,
      }
    }

    setResponseStatus(event, 500)
    return {
      statusCode: 500,
      status: 'error',
      message: 'Failed to process batch organization integrations',
    }
  }
})

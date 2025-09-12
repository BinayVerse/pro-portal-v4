import { CustomError } from '../../../utils/custom.error'
import { query } from '../../../utils/db'
import jwt from 'jsonwebtoken'

export default defineEventHandler(async (event) => {
  const userId = getRouterParam(event, 'id')
  const params = await readBody(event)
  const config = useRuntimeConfig()

  const token = event.node.req.headers['authorization']?.split(' ')[1]
  if (!token) {
    setResponseStatus(event, 401)
    throw new CustomError('Unauthorized: No token provided', 401)
  }

  let orgId
  try {
    const decodedToken = jwt.verify(token, config.jwtToken as string)
    orgId = (decodedToken as { org_id: number }).org_id
    if (!orgId) {
      setResponseStatus(event, 401)
      throw new CustomError('Unauthorized: Invalid org_id', 401)
    }
  } catch (err) {
    setResponseStatus(event, 401)
    throw new CustomError('Unauthorized: Invalid token', 401)
  }

  if (!userId) {
    setResponseStatus(event, 400)
    throw new CustomError('User ID is required', 400)
  }

  if (typeof params.is_active === 'undefined') {
    setResponseStatus(event, 400)
    throw new CustomError('is_active parameter is required', 400)
  }

  const isActive = params.is_active === true || params.is_active === 'true'

  try {
    const updateQuery = `
      UPDATE users
      SET is_active = $1, updated_at = CURRENT_TIMESTAMP
      WHERE user_id = $2 AND org_id = $3
      RETURNING user_id, is_active
    `

    const result = await query(updateQuery, [isActive, userId, orgId])

    if (result.rowCount === 0) {
      setResponseStatus(event, 404)
      throw new CustomError('User not found or unauthorized', 404)
    }

    setResponseStatus(event, 200)
    return {
      statusCode: 200,
      status: 'success',
      message: `User ${isActive ? 'activated' : 'deactivated'} successfully`,
      data: result.rows[0],
    }
  } catch (err: any) {
    console.error('Error updating user active status:', err)
    setResponseStatus(event, 500)
    throw new CustomError(err.message || 'Error updating user status', 500)
  }
})

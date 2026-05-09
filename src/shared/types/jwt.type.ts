export interface AccessTokenPayloadCreate {
  userId: string
  deviceId: string
}

export interface AccessTokenPayload extends AccessTokenPayloadCreate {
  exp: number
  iat: number
}

export interface RefreshTokenPayloadCreate {
  userId: string
}

export interface RefreshTokenPayload extends RefreshTokenPayloadCreate {
  exp: number
  iat: number
}

export interface AdminAccessTokenPayloadCreate {
  adminId: string
  deviceId: string
}

export interface AdminAccessTokenPayload extends AdminAccessTokenPayloadCreate {
  exp: number
  iat: number
}

export interface AdminRefreshTokenPayloadCreate {
  adminId: string
}

export interface AdminRefreshTokenPayload extends AdminRefreshTokenPayloadCreate {
  exp: number
  iat: number
}

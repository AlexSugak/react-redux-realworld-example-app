import {
  LOGIN,
  REGISTER,
  LOGIN_PAGE_UNLOADED,
  REGISTER_PAGE_UNLOADED,
  ASYNC_START,
  UPDATE_FIELD_AUTH,
} from '../constants/actionTypes'
import { assertNever } from 'assert-never'

const authInitialState = {
  inProgress: false,
  errors: null as null | string[],
  email: '',
  password: '',
  username: '',
}

export type AuthInitialState = typeof authInitialState
export type AuthActions =
  | { type: 'LOGIN'; payload: any; error?: any }
  | { type: 'REGISTER'; payload: any; error?: any }
  | { type: 'LOGIN_PAGE_UNLOADED' }
  | { type: 'REGISTER_PAGE_UNLOADED' }
  | { type: 'ASYNC_START'; subtype: AuthActions['type'] }
  | { type: 'UPDATE_FIELD_AUTH'; key: string; value: string }

export default (state = authInitialState, action: AuthActions) => {
  switch (action.type) {
    case LOGIN:
    case REGISTER:
      return {
        ...state,
        inProgress: false,
        errors: action.error ? action.payload.errors : null,
      }
    case LOGIN_PAGE_UNLOADED:
    case REGISTER_PAGE_UNLOADED:
      return {}
    case ASYNC_START:
      if (action.subtype === LOGIN || action.subtype === REGISTER) {
        return { ...state, inProgress: true }
      }
      break
    case UPDATE_FIELD_AUTH:
      return { ...state, [action.key]: action.value }
    default:
      // TS tip: assertNever!
      void assertNever(action, true)
      return state
  }

  return state
}

import { Link } from 'react-router-dom'
import ListErrors from './ListErrors'
import React from 'react'
import agent from '../agent'
import { connect, ConnectedProps } from 'react-redux'
import { UPDATE_FIELD_AUTH, LOGIN, LOGIN_PAGE_UNLOADED } from '../constants/actionTypes'
import { AuthInitialState, AuthActions } from '../reducers/auth'

const mapStateToProps = (state: { auth: AuthInitialState }) => ({ ...state.auth })

const mapDispatchToProps = (dispatch: (action: AuthActions) => void) => ({
  onChangeEmail: (value: string) => dispatch({ type: UPDATE_FIELD_AUTH, key: 'email', value }),
  onChangePassword: (value: string) =>
    dispatch({ type: UPDATE_FIELD_AUTH, key: 'password', value }),
  onSubmit: (email: string, password: string) =>
    dispatch({ type: LOGIN, payload: agent.Auth.login(email, password) }),
  onUnload: () => dispatch({ type: LOGIN_PAGE_UNLOADED }),
})

const connector = connect(mapStateToProps, mapDispatchToProps)

type LoginProps = ConnectedProps<typeof connector>

class Login extends React.Component<LoginProps> {
  componentWillUnmount() {
    this.props.onUnload()
  }

  changeEmail = (ev: React.ChangeEvent<HTMLInputElement>) =>
    this.props.onChangeEmail(ev.target.value)

  changePassword = (ev: React.ChangeEvent<HTMLInputElement>) =>
    this.props.onChangePassword(ev.target.value)

  submitForm = (email: string, password: string) => (ev: React.ChangeEvent<HTMLFormElement>) => {
    ev.preventDefault()
    this.props.onSubmit(email, password)
  }

  render() {
    const { email, password } = this.props

    console.log('[auth] re-render')

    return (
      <div className="auth-page">
        <div className="container page">
          <div className="row">
            <div className="col-md-6 offset-md-3 col-xs-12">
              <h1 className="text-xs-center">Sign In</h1>
              <p className="text-xs-center">
                <Link to="/register">Need an account?</Link>
              </p>

              <ListErrors errors={this.props.errors} />

              <form onSubmit={this.submitForm(email, password)}>
                <fieldset>
                  <fieldset className="form-group">
                    <input
                      className="form-control form-control-lg"
                      type="email"
                      placeholder="Email"
                      value={email}
                      onChange={this.changeEmail}
                    />
                  </fieldset>

                  <fieldset className="form-group">
                    <input
                      className="form-control form-control-lg"
                      type="password"
                      placeholder="Password"
                      value={password}
                      onChange={this.changePassword}
                    />
                  </fieldset>

                  <button
                    className="btn btn-lg btn-primary pull-xs-right"
                    type="submit"
                    disabled={this.props.inProgress}
                  >
                    Sign in
                  </button>
                </fieldset>
              </form>
            </div>
          </div>
        </div>
      </div>
    )
  }
}

export default connector(Login)

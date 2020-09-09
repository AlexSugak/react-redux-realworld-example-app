import { Link } from 'react-router-dom'
import ListErrors from './ListErrors'
import React from 'react'
import agent from '../agent'
import { connect, ConnectedProps } from 'react-redux'
import { UPDATE_FIELD_AUTH, REGISTER, REGISTER_PAGE_UNLOADED } from '../constants/actionTypes'
import { AuthInitialState, AuthActions } from '../reducers/auth'

const mapStateToProps = (state: { auth: AuthInitialState }) => ({ ...state.auth })

const mapDispatchToProps = (dispatch: (action: AuthActions) => void) => ({
  onChangeEmail: (value: string) => dispatch({ type: UPDATE_FIELD_AUTH, key: 'email', value }),
  onChangePassword: (value: string) =>
    dispatch({ type: UPDATE_FIELD_AUTH, key: 'password', value }),
  onChangeUsername: (value: string) =>
    dispatch({ type: UPDATE_FIELD_AUTH, key: 'username', value }),
  onSubmit: (username: string, email: string, password: string) => {
    const payload = agent.Auth.register(username, email, password)
    dispatch({ type: REGISTER, payload })
  },
  onUnload: () => dispatch({ type: REGISTER_PAGE_UNLOADED }),
})

const connector = connect(mapStateToProps, mapDispatchToProps)

type RegisterProps = ConnectedProps<typeof connector>

class Register extends React.Component<RegisterProps> {
  changeEmail = (ev: React.ChangeEvent<HTMLInputElement>) =>
    this.props.onChangeEmail(ev.target.value)
  changePassword = (ev: React.ChangeEvent<HTMLInputElement>) =>
    this.props.onChangePassword(ev.target.value)
  changeUsername = (ev: React.ChangeEvent<HTMLInputElement>) =>
    this.props.onChangeUsername(ev.target.value)

  submitForm = (username: string, email: string, password: string) => (
    ev: React.ChangeEvent<HTMLFormElement>
  ) => {
    ev.preventDefault()
    this.props.onSubmit(username, email, password)
  }

  componentWillUnmount() {
    this.props.onUnload()
  }

  render() {
    const { email, password, username } = this.props

    console.log('[auth] re-render')

    return (
      <div className="auth-page">
        <div className="container page">
          <div className="row">
            <div className="col-md-6 offset-md-3 col-xs-12">
              <h1 className="text-xs-center">Sign Up</h1>
              <p className="text-xs-center">
                <Link to="/login">Have an account?</Link>
              </p>

              <ListErrors errors={this.props.errors} />

              <form onSubmit={this.submitForm(username, email, password)}>
                <fieldset>
                  <fieldset className="form-group">
                    <input
                      className="form-control form-control-lg"
                      type="text"
                      placeholder="Username"
                      value={this.props.username}
                      onChange={this.changeUsername}
                    />
                  </fieldset>

                  <fieldset className="form-group">
                    <input
                      className="form-control form-control-lg"
                      type="email"
                      placeholder="Email"
                      value={this.props.email}
                      onChange={this.changeEmail}
                    />
                  </fieldset>

                  <fieldset className="form-group">
                    <input
                      className="form-control form-control-lg"
                      type="password"
                      placeholder="Password"
                      value={this.props.password}
                      onChange={this.changePassword}
                    />
                  </fieldset>

                  <button
                    className="btn btn-lg btn-primary pull-xs-right"
                    type="submit"
                    disabled={this.props.inProgress}
                  >
                    Sign up
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

export default connect(mapStateToProps, mapDispatchToProps)(Register)

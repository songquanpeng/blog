import React from 'react';
import { connect } from 'react-redux';
import { Button, Form, Grid, Header, Segment } from 'semantic-ui-react';

import { login, setGlobalPortal, getStatus } from '../../actions';

class Login extends React.Component {
  state = { username: '', password: '', show: false };

  componentDidMount() {
    if (this.props.isLogin) {
      this.props.history.push('/');
    }
  }

  onInputChange = e => {
    const { name, value } = e.target;
    this.setState({ [name]: value });
  };

  onSubmit = async () => {
    try {
      let { status, message } = await this.props.login(
        this.state.username,
        this.state.password
      );

      if (status) {
        this.props.getStatus();
        this.props.setGlobalPortal(
          true,
          'info',
          'Success',
          'Login successfully!'
        );
        this.props.history.push('/');
      } else {
        this.props.setGlobalPortal(true, 'negative', 'Failure', message);
      }
    } catch (e) {
      this.props.setGlobalPortal(
        true,
        'negative',
        'Network Error',
        e.toString()
      );
    }
  };

  render() {
    return (
      <Grid
        textAlign="center"
        style={{ height: '80vh' }}
        verticalAlign="middle"
      >
        <Grid.Column style={{ maxWidth: 450 }}>
          <Header as="h2" textAlign="center">
            Provide Credentials
          </Header>
          <Form size="large">
            <Segment>
              <Form.Input
                fluid
                icon="user"
                iconPosition="left"
                placeholder="Username"
                name="username"
                value={this.state.username}
                onChange={this.onInputChange}
              />
              <Form.Input
                fluid
                icon="lock"
                iconPosition="left"
                placeholder="Password"
                type={`${this.state.show ? null : 'password'}`}
                name="password"
                value={this.state.password}
                onChange={this.onInputChange}
              />
              <Form.Checkbox
                name="show"
                label="Show password"
                onChange={() => this.setState({ show: !this.state.show })}
                checked={this.state.show}
              />
              <Button fluid size="large" onClick={this.onSubmit}>
                Login
              </Button>
            </Segment>
          </Form>
        </Grid.Column>
      </Grid>
    );
  }
}

const mapStateToProps = state => {
  return state;
};

export default connect(
  mapStateToProps,
  { login, setGlobalPortal, getStatus }
)(Login);

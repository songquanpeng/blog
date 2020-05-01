import React from 'react';
import axios from 'axios';
import { connect } from 'react-redux';
import {
  Button,
  Form,
  Grid,
  Icon,
  Image,
  Segment,
  Input,
  Divider,
  Container
} from 'semantic-ui-react';
import { setGlobalPortal } from '../../actions';

const options = [
  { key: 0, text: 'Banned User', value: 0 },
  { key: 1, text: 'Normal User', value: 1 },
  { key: 10, text: 'Administrator', value: 10 },
  { key: 100, text: 'Super User', value: 100 }
];

class EditUser extends React.Component {
  constructor(props) {
    super(props);
    const createNew = this.props.match.path === '/user/new';
    this.state = {
      loading: !createNew,
      isCreatingNewUser: createNew,
      user: {
        id: this.props.match.params.id,
        username: '',
        display_name: '',
        status: 1,
        email: '',
        url: '',
        avatar: '',
        password: ''
      }
    };
  }

  componentDidMount() {
    const that = this;
    if (!that.state.isCreatingNewUser) {
      axios
        .get('/api/user/' + that.state.user.id)
        .then(function(res) {
          if (res.data.status) {
            that.setState({
              user: res.data.user
            });
          } else {
            console.error(res.data.message);
          }
        })
        .catch(function(err) {
          console.error(err);
        })
        .finally(() => {
          this.setState({ loading: false });
        });
    }
  }

  onInputChange = e => {
    let user = { ...this.state.user };
    user[e.target.name] = e.target.value;
    this.setState({ user });
  };

  onSelectChange = (e, { value }) => {
    let user = { ...this.state.user };
    user.status = value;
    this.setState({ user });
  };

  submitData = async () => {
    const user = this.state.user;
    const res = this.state.isCreatingNewUser
      ? await axios.put(`/api/user`, user)
      : await axios.post(`/api/user`, user);
    const { status, message } = res.data;
    if (status) {
      this.props.setGlobalPortal(
        true,
        'info',
        'Success',
        'Successfully processed.'
      );
      this.props.history.goBack();
    } else {
      this.props.setGlobalPortal(true, 'negative', 'Failure', message);
    }
  };

  onFileInputChange = event => {
    this.setState({ loading: true });
    let imageForm = new FormData();
    imageForm.append('smfile', event.target.files[0]);
    axios
      .post('https://sm.ms/api/upload', imageForm, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      })
      .then(res => {
        this.setState({ loading: false });
        if (res.data && res.data.success) {
          let goods = { ...this.state.goods };
          goods.picture = res.data.data.url;
          this.setState({ goods });
        } else {
          this.props.setGlobalPortal(
            true,
            'negative',
            'Failure',
            res.data.message
          );
        }
      });
  };

  render() {
    return (
      <Container style={{ marginTop: '16px' }}>
        <Segment loading={this.state.loading}>
          <Grid columns={2}>
            <Grid.Column>
              <Image src={this.state.user.avatar} size="large" />
            </Grid.Column>
            <Grid.Column>
              <Container>
                <Form>
                  <Form.Field required>
                    <label>User name</label>
                    <input
                      placeholder="User name"
                      name="username"
                      value={this.state.user.username}
                      onChange={this.onInputChange}
                    />
                  </Form.Field>
                  <Form.Field required>
                    <label>Password</label>
                    <input
                      placeholder="Password"
                      name="password"
                      type={'password'}
                      value={this.state.user.password}
                      onChange={this.onInputChange}
                    />
                  </Form.Field>
                  <Form.Field>
                    <label>URL</label>
                    <input
                      placeholder="url"
                      name="url"
                      value={this.state.user.url}
                      onChange={this.onInputChange}
                    />
                  </Form.Field>
                  <Form.Group widths="equal">
                    <Form.Input
                      fluid
                      label="Display name"
                      name="display_name"
                      value={this.state.user.display_name}
                      type="text"
                      onChange={this.onInputChange}
                      placeholder="display name"
                    />
                    <Form.Input
                      fluid
                      label="Email"
                      name="email"
                      value={this.state.user.email}
                      type="email"
                      onChange={this.onInputChange}
                      placeholder="email"
                    />
                    <Form.Select
                      fluid
                      label="Status"
                      name="status"
                      value={this.state.user.status}
                      onChange={this.onSelectChange}
                      options={options}
                      placeholder="status"
                    />
                  </Form.Group>
                  <Form.Field>
                    <input
                      ref="imageInput"
                      type="file"
                      id="uploadImage"
                      name="file"
                      accept="image/*"
                      onChange={this.onFileInputChange}
                      style={{ display: 'none' }}
                    />
                    <label>Avatar</label>
                    <Input
                      action={{
                        icon: 'upload',
                        onClick: () => {
                          this.refs.imageInput.click();
                        }
                      }}
                      placeholder="Avatar url"
                      name="avatar"
                      value={this.state.user.avatar}
                      onChange={this.onInputChange}
                    />
                  </Form.Field>
                </Form>
              </Container>
              <Divider horizontal>EDIT</Divider>
              <Container textAlign="center">
                <Button animated="fade" size="large" onClick={this.clearData}>
                  <Button.Content hidden>RESET</Button.Content>
                  <Button.Content visible>
                    <Icon name="undo" />
                  </Button.Content>
                </Button>
                <Button
                  animated="fade"
                  size="large"
                  color="green"
                  onClick={this.submitData}
                >
                  <Button.Content hidden>SUBMIT</Button.Content>
                  <Button.Content visible>
                    <Icon name="send" />
                  </Button.Content>
                </Button>
              </Container>
            </Grid.Column>
          </Grid>
        </Segment>
      </Container>
    );
  }
}

export default connect(
  null,
  { setGlobalPortal }
)(EditUser);

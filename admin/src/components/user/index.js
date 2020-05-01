import React, { Component } from 'react';
import { connect } from 'react-redux';
import { setGlobalPortal } from '../../actions';
import _ from 'lodash';
import axios from 'axios';
import { Link } from 'react-router-dom';

import {
  Grid,
  Container,
  Segment,
  Image,
  Header,
  Item,
  Divider,
  Button,
  Icon,
  Label
} from 'semantic-ui-react';

const USER_STATUS = [
  {
    text: 'Banned user',
    status: 0,
    color: 'red'
  },
  {
    text: 'Normal user',
    status: 1,
    color: ''
  },
  {
    text: 'Administrator',
    status: 10,
    color: 'blue'
  },
  {
    text: 'Super user',
    status: 100,
    color: 'yellow'
  }
];

class User extends Component {
  constructor(props) {
    super(props);
    this.state = {
      userId: -1,
      users: [],
      user: {},
      loading: false,
      loadingUserStatus: true
    };
  }

  static getDerivedStateFromProps({ status }) {
    return { status };
  }

  async componentDidMount() {
    if (this.state.status === 0) {
      this.props.setGlobalPortal(
        true,
        'negative',
        'Access denied',
        'Please provide valid credentials.'
      );
      this.props.history.push('/login');
      return;
    }
    await this.fetchData();
    await this.fetchUserStatus();
  }

  fetchUserStatus = async () => {
    try {
      const res = await axios.get(`/api/user/status`);
      const { status, message, user } = res.data;
      if (status) {
        this.setState({ user });
      } else {
        this.props.setGlobalPortal(true, 'negative', 'Error', message);
      }
      this.setState({ loadingUserStatus: false });
    } catch (e) {
      this.props.setGlobalPortal(
        true,
        'negative',
        'Network error',
        e.toString()
      );
    }
  };

  fetchData = async () => {
    try {
      this.setState({ loading: true });
      const res = await axios.get(`/api/user`);
      const { status, message, users } = res.data;
      if (status) {
        this.setState({ users });
      } else {
        this.props.setGlobalPortal(true, 'negative', 'Error', message);
      }
      this.setState({ loading: false });
    } catch (e) {
      this.props.setGlobalPortal(
        true,
        'negative',
        'Network error',
        e.toString()
      );
    }
  };

  deleteUser = id => {
    const that = this;
    axios.delete(`/api/user/${id}`).then(async function(res) {
      const { status, message } = res.data;
      if (status) {
        that.props.setGlobalPortal(
          true,
          'positive',
          'Success',
          'User has been deleted.'
        );
        await that.fetchData();
      } else {
        that.props.setGlobalPortal(true, 'negative', 'Failure', message);
      }
    });
  };

  renderUserCard() {
    const {
      username,
      display_name,
      status,
      email,
      avatar,
      id
    } = this.state.user;
    return (
      <Segment loading={this.state.loadingUserStatus}>
        <Grid>
          <Grid.Column width={10}>
            <Header as="h1">Information</Header>
          </Grid.Column>
          <Grid.Column width={6}>
            <Button
              floated="right"
              animated="fade"
              as={Link}
              to={`/user/${id}`}
              primary
            >
              <Button.Content hidden>Edit</Button.Content>
              <Button.Content visible>
                <Icon name="edit" />
              </Button.Content>
            </Button>
          </Grid.Column>
        </Grid>
        <Divider />
        <Grid columns={2}>
          <Grid.Column width={8}>
            <Image src={avatar} size="small" rounded />
          </Grid.Column>
          <Grid.Column width={8}>
            <Header as="h1">{username}</Header>
            <p>{display_name}</p>
            <p>
              {status !== undefined
                ? USER_STATUS.find(e => e.status === status).text
                : ''}
            </p>
            <p>{email}</p>
          </Grid.Column>
        </Grid>
      </Segment>
    );
  }

  renderUserList() {
    return (
      <Segment loading={this.state.loading}>
        <Grid>
          <Grid.Column width={12}>
            <Header as="h2">Users</Header>
          </Grid.Column>
          <Grid.Column width={4}>
            <Button
              floated="right"
              animated="fade"
              as={Link}
              to="/user/new"
              primary
            >
              <Button.Content hidden>New</Button.Content>
              <Button.Content visible>
                <Icon name="plus" />
              </Button.Content>
            </Button>
          </Grid.Column>
        </Grid>
        <Divider />
        <Item.Group divided>
          {_.map(this.state.users, user => {
            const {
              id,
              username,
              display_name,
              status,
              email,
              url,
              avatar
            } = user;
            return (
              <Item key={id}>
                <Item.Image src={avatar} />
                <Item.Content>
                  <Item.Header as="a">{username}</Item.Header>
                  <Item.Meta>
                    <span>{display_name}</span>
                  </Item.Meta>
                  <Item.Description>{email}</Item.Description>
                  <Item.Extra>
                    <Button
                      floated="right"
                      animated="fade"
                      onClick={() => this.deleteUser(id)}
                      color={'red'}
                    >
                      <Button.Content hidden>Delete</Button.Content>
                      <Button.Content visible>
                        <Icon name="delete" />
                      </Button.Content>
                    </Button>
                    <Button
                      floated="right"
                      animated="fade"
                      as={Link}
                      to={`/user/${id}`}
                      color={'blue'}
                    >
                      <Button.Content hidden>Edit</Button.Content>
                      <Button.Content visible>
                        <Icon name="edit" />
                      </Button.Content>
                    </Button>
                    <Label
                      color={USER_STATUS.find(e => e.status === status).color}
                    >
                      {USER_STATUS.find(e => e.status === status).text}
                    </Label>
                  </Item.Extra>
                </Item.Content>
              </Item>
            );
          })}
        </Item.Group>
      </Segment>
    );
  }

  renderStatistic() {
    return (
      <Segment loading={this.state.loading}>
        <Header as="h3">Statistic</Header>
        <Divider />
        <Container textAlign="center">
          <p>TODO</p>
        </Container>
      </Segment>
    );
  }

  render() {
    return (
      <Container style={{ marginTop: '16px' }}>
        <Grid>
          <Grid.Column width={6}>
            {this.renderUserCard()}
            {this.renderStatistic()}
          </Grid.Column>
          <Grid.Column width={10}>{this.renderUserList()}</Grid.Column>
        </Grid>
      </Container>
    );
  }
}

const mapStateToProps = state => {
  return state;
};

export default connect(
  mapStateToProps,
  { setGlobalPortal }
)(User);

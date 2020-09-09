import React, { Component } from 'react';

import { connect } from 'react-redux';

import axios from 'axios';
import {
  Table,
  Tag,
  Button,
  message as Message,
  Tooltip,
  Space,
  Popconfirm,
} from 'antd';

const USER_STATUS = [
  {
    text: 'Banned user',
    status: 0,
    color: 'red',
  },
  {
    text: 'Normal user',
    status: 1,
    color: 'green',
  },
  {
    text: 'Administrator',
    status: 10,
    color: 'blue',
  },
  {
    text: 'Super user',
    status: 100,
    color: 'gold',
  },
];

class Users extends Component {
  constructor(props) {
    super(props);
    this.state = {
      userId: -1,
      users: [],
      user: {},
      loading: false,
      loadingUserStatus: true,
    };
    this.columns = [
      {
        title: 'Username',
        dataIndex: 'username',
        render: (value, record) => (
          <Tooltip title={record.display_name}>
            <a href={record.url}>{value}</a>
          </Tooltip>
        ),
      },
      {
        title: 'Email',
        dataIndex: 'email',
        render: (value) => <p>{value}</p>,
      },
      {
        title: 'Status',
        dataIndex: 'status',
        render: (value) => (
          <Tag color={USER_STATUS.find((e) => e.status === value).color}>
            {USER_STATUS.find((e) => e.status === value).text}
          </Tag>
        ),
      },
      {
        title: 'Operation',
        render: (record) => (
          <Space>
            <Button onClick={() => this.editUser(record.id)}>Edit</Button>
            <Popconfirm
              placement="rightTop"
              title={'Are your sure to delete this user?'}
              onConfirm={() => this.deleteUser(record.id)}
              okText="Yes"
              cancelText="No"
            >
              <Button type="danger" danger>
                Delete
              </Button>
            </Popconfirm>
          </Space>
        ),
      },
    ];
  }

  static getDerivedStateFromProps({ status }) {
    return { status };
  }

  async componentDidMount() {
    if (this.state.status === 0) {
      Message.error('Please provide valid credentials.');
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
        Message.config(message);
      }
      this.setState({ loadingUserStatus: false });
    } catch (e) {
      Message.error(e.message);
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
        Message.error(message);
      }
      this.setState({ loading: false });
    } catch (e) {
      Message.error(e.message);
    }
  };

  deleteUser = (id) => {
    const that = this;
    axios.delete(`/api/user/${id}`).then(async function (res) {
      const { status, message } = res.data;
      if (status) {
        Message.success('User has been deleted.');
        await that.fetchData();
      } else {
        Message.error(message);
      }
    });
  };

  editUser = (id) => {
    this.props.history.push(`/users/${id}`);
  };

  render() {
    return (
      <div className={'content-area'}>
        <h1>Users</h1>
        <Table
          columns={this.columns}
          dataSource={this.state.users}
          rowKey={'id'}
          style={{ marginTop: '16px' }}
        />
      </div>
    );
  }
}

const mapStateToProps = (state) => {
  return state;
};

export default connect(mapStateToProps)(Users);

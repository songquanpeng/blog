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
        title: '用户名',
        dataIndex: 'username',
        render: (value, record) => (
          <Tooltip title={record.displayName}>
            <a href={record.url}>{value}</a>
          </Tooltip>
        ),
      },
      {
        title: '邮箱',
        dataIndex: 'email',
        render: (value) => <>{value ? value : '无'}</>,
      },
      {
        title: '是否是超级管理员',
        dataIndex: 'isAdmin',
        render: (value) => (
          <Tag color={value ? 'green' : ''}>{value ? '是' : '否'}</Tag>
        ),
      },
      {
        title: '是否是普通管理员',
        dataIndex: 'isModerator',
        render: (value) => (
          <Tag color={value ? 'green' : ''}>{value ? '是' : '否'}</Tag>
        ),
      },
      {
        title: '状态',
        dataIndex: 'isBlocked',
        render: (value) => (
          <Tag color={value ? 'red' : 'green'}>
            {value ? '被封禁' : '正常'}
          </Tag>
        ),
      },
      {
        title: '操作',
        render: (record) => (
          <Space>
            <Button onClick={() => this.editUser(record.id)}>编辑</Button>
            <Popconfirm
              placement="rightTop"
              title={'确认删除用户？'}
              onConfirm={() => this.deleteUser(record.id)}
              okText="确认"
              cancelText="取消"
            >
              <Button type="danger" danger>
                删除
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
      Message.error('访问被拒绝');
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

  addUser = () => {
    this.props.history.push('/users/new');
  };

  refreshToken = async ()=>{
    try {
      const res = await axios.post(`/api/user/refresh_token`);
      const { status, message, accessToken } = res.data;
      if (status) {
        await navigator.clipboard.writeText(accessToken);
        Message.success('Access Token 刷新成功，已复制到剪切板');
      } else {
        Message.error(message);
      }
    } catch (e) {
      Message.error(e.message);
    }
  }

  deleteUser = (id) => {
    const that = this;
    axios.delete(`/api/user/${id}`).then(async function (res) {
      const { status, message } = res.data;
      if (status) {
        Message.success('用户删除成功');
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
        <h1>用户管理</h1>
        <Table
          columns={this.columns}
          dataSource={this.state.users}
          rowKey={'id'}
          style={{ marginTop: '16px' }}
          loading={this.state.loading}
        />
        <Button
          onClick={() => {
            this.addUser();
          }}
        >
          创建新用户账户
        </Button>
        <Button
          onClick={() => {
            this.refreshToken().then();
          }}
          style={{ marginLeft: '16px' }}
        >
          刷新 Access Token
        </Button>
      </div>
    );
  }
}

const mapStateToProps = (state) => {
  return state;
};

export default connect(mapStateToProps)(Users);

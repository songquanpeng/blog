import React from 'react';
import {
  Layout,
  Menu,
  Avatar,
  Dropdown,
  Space,
  Row,
  Col,
  Button,
  Upload,
  Popconfirm,
  Divider,
  message
} from 'antd';

import {
  MenuUnfoldOutlined,
  MenuFoldOutlined,
  UserOutlined,
  EditOutlined,
  DashboardOutlined,
  FileTextOutlined,
  CommentOutlined,
  CloudUploadOutlined,
  SettingOutlined,
  LogoutOutlined
} from '@ant-design/icons';

import { Link, Switch, Route } from 'react-router-dom';

import CodeEditor from './CodeEditor';
import RichTextEditor from './RichTextEditor';
import Dashboard from './Dashboard';
import Settings from './Settings';
import Users from './Users';
import Files from './Files';
import Comments from './Comments';
import Posts from './Posts';

import './App.css';

const { Header, Sider, Content } = Layout;
const { SubMenu } = Menu;

class App extends React.Component {
  state = {
    collapsed: false
  };

  toggle = () => {
    this.setState({
      collapsed: !this.state.collapsed
    });
  };

  render() {
    const menu = (
      <Menu>
        <Menu.Item key="1" icon={<UserOutlined />}>
          My Account
        </Menu.Item>
        <Menu.Item key="2" icon={<SettingOutlined />}>
          My Setting
        </Menu.Item>
        <Menu.Divider />
        <Menu.Item key="3" icon={<LogoutOutlined />}>
          Logout
        </Menu.Item>
      </Menu>
    );

    return (
      <Layout style={{ height: '100%' }}>
        <Sider trigger={null} collapsible collapsed={this.state.collapsed}>
          <div className="logo">
            <h1>System Admin</h1>
          </div>
          <Menu theme="dark" mode="inline" defaultSelectedKeys={['0']}>
            <Menu.Item key="0" icon={<DashboardOutlined />}>
              <Link to={'/dashboard'}>Dashboard</Link>
            </Menu.Item>
            <SubMenu key="sub0" icon={<EditOutlined />} title="Editor">
              <Menu.Item key="1">
                <Link to={'/rich-text-editor'}>Rich Text Editor</Link>
              </Menu.Item>
              <Menu.Item key="2">
                <Link to={'/code-editor'}>Code Editor</Link>
              </Menu.Item>
            </SubMenu>
            <Menu.Item key="3" icon={<FileTextOutlined />}>
              <Link to={'/posts'}>Posts</Link>
            </Menu.Item>
            <Menu.Item key="4" icon={<CommentOutlined />}>
              <Link to={'/comments'}>Comments</Link>
            </Menu.Item>
            <Menu.Item key="5" icon={<CloudUploadOutlined />}>
              <Link to={'/files'}>Files</Link>
            </Menu.Item>
            <Menu.Item key="6" icon={<UserOutlined />}>
              <Link to={'/users'}>Users</Link>
            </Menu.Item>
            <Menu.Item key="7" icon={<SettingOutlined />}>
              <Link to={'/settings'}>Settings</Link>
            </Menu.Item>
          </Menu>
        </Sider>
        <Layout className="site-layout">
          <Header className="site-layout-background" style={{ padding: 0 }}>
            {React.createElement(
              this.state.collapsed ? MenuUnfoldOutlined : MenuFoldOutlined,
              {
                className: 'trigger',
                onClick: this.toggle
              }
            )}
            <Space style={{ float: 'right', marginRight: '16px' }}>
              <Dropdown overlay={menu} placement="bottomCenter">
                <Button type={'text'} icon={<UserOutlined />} size={'large'}>
                  Admin
                </Button>
              </Dropdown>
            </Space>
          </Header>
          <Content
            className="site-layout-background"
            style={{
              margin: '24px 16px',
              padding: 24,
              minHeight: 280
            }}
          >
            <Switch>
              <Route path="/code-editor" exact component={CodeEditor} />
              <Route
                path="/rich-text-editor"
                exact
                component={RichTextEditor}
              />
              <Route path="/dashboard" exact component={Dashboard} />
              <Route path="/users" exact component={Users} />
              <Route path="/settings" exact component={Settings} />
              <Route path="/files" exact component={Files} />
              <Route path="/comments" exact component={Comments} />
              <Route path="/posts" exact component={Posts} />
            </Switch>
          </Content>
        </Layout>
      </Layout>
    );
  }
}
export default App;

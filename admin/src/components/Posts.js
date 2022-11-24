import React, { Component } from 'react';
import {
  Table,
  Tag,
  Button,
  message as Message,
  Tooltip,
  Space,
  Popconfirm,
  Input,
  Select,
  Row,
  Col,
} from 'antd';
import { CheckCircleOutlined, MinusCircleOutlined } from '@ant-design/icons';
import { connect } from 'react-redux';
import axios from 'axios';

import { PAGE_OPTIONS } from './Editor';
import { getDate } from '../utils';

const { Search } = Input;

class Posts extends Component {
  constructor(props) {
    super(props);
    this.state = {
      pages: [],
      loading: false,
      searchTypingTimeout: 0,
      searchOption: -1,
      keyword: '',
      activeItem: '',
      direction: 'up',
      status: 0,
    };
    this.columns = [
      {
        title: '标题',
        dataIndex: 'title',
        sorter: (a, b) => a.title > b.title,
        sortDirections: ['descend', 'ascend'],
        render: (value, record) => (
          <Tooltip
            title={`发布于：${record.createdAt}\n编辑于：${record.updatedAt}`}
          >
            <span>
              <a target='_blank' href={'/page/' + record.link}>{value ? value : '无标题'}</a>
            </span>
          </Tooltip>
        ),
      },
      {
        title: '类型',
        dataIndex: 'type',
        render: (value) => (
          <Tag color={PAGE_OPTIONS[value + 1].key}>
            {PAGE_OPTIONS[value + 1].label}
          </Tag>
        ),
      },
      {
        title: '阅读量',
        dataIndex: 'view',
        sorter: (a, b) => parseInt(a.view) > parseInt(b.view),
        sortDirections: ['descend', 'ascend'],
        render: (value) => <Tag color={'blue'}>{value}</Tag>,
      },
      {
        title: '标签',
        dataIndex: 'tag',
        render: (tags) => (
          <>
            {tags.split(';').map((tag) => {
              return (
                <Tag color={'cyan'} key={tag}>
                  {tag}
                </Tag>
              );
            })}
          </>
        ),
      },
      {
        title: '状态',
        dataIndex: 'pageStatus',
        sorter: (a, b) => parseInt(a.pageStatus) > parseInt(b.pageStatus),
        sortDirections: ['descend', 'ascend'],
        render: (value, record) => {
          if (value === 0) {
            return (
              <Tag
                icon={<MinusCircleOutlined />}
                color="default"
                onClick={() => this.switchStatus(record.id, 'pageStatus')}
                style={{cursor: 'pointer'}}
              >
                已撤回
              </Tag>
            );
          } else if (value === 1) {
            return (
              <Tag
                icon={<CheckCircleOutlined />}
                color="success"
                onClick={() => this.switchStatus(record.id, 'pageStatus')}
                style={{cursor: 'pointer'}}
              >
                已发布
              </Tag>
            );
          } else if (value === 2) {
            return (
              <Tag
                icon={<CheckCircleOutlined />}
                color="orange"
                onClick={() => this.switchStatus(record.id, 'pageStatus')}
                style={{cursor: 'pointer'}}
              >
                已置顶
              </Tag>
            );
          } else {
            return (
              <Tag
                icon={<MinusCircleOutlined />}
                color="default"
                onClick={() => this.switchStatus(record.id, 'pageStatus')}
                style={{cursor: 'pointer'}}
              >
                已隐藏
              </Tag>
            );
          }
        },
      },
      {
        title: '评论',
        dataIndex: 'commentStatus',
        sorter: (a, b) => parseInt(a.commentStatus) > parseInt(b.commentStatus),
        sortDirections: ['descend', 'ascend'],
        render: (value, record) =>
          value === 1 ? (
            <Tag
              icon={<CheckCircleOutlined />}
              color="success"
              onClick={() => this.switchStatus(record.id, 'commentStatus')}
              style={{cursor: 'pointer'}}
            >
              已开启
            </Tag>
          ) : (
            <Tag
              icon={<MinusCircleOutlined />}
              color="default"
              onClick={() => this.switchStatus(record.id, 'commentStatus')}
              style={{cursor: 'pointer'}}
            >
              已关闭
            </Tag>
          ),
      },
      {
        title: '操作',
        render: (record) => (
          <Space>
            <Button type="primary" onClick={() => this.editPage(record.id)}>
              编辑
            </Button>
            <Button onClick={() => this.exportPage(record.id)}>导出</Button>
            <Popconfirm
              placement="rightTop"
              title={'确认删除页面？'}
              onConfirm={() => this.deletePage(record.id)}
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
    await this.loadPagesFromServer();
  }

  onSearchOptionChange = (e, { value }) => {
    this.setState({ searchOption: value }, () => {
      this.search();
    });
  };

  searchPages = (e) => {
    this.setState({ keyword: e.target.value });
    if (this.state.searchTypingTimeout) {
      clearTimeout(this.state.searchTypingTimeout);
    }
    this.setState({
      searchTypingTimeout: setTimeout(() => {
        this.search();
      }, 500),
    });
  };

  search = () => {
    const that = this;
    axios
      .post(`/api/page/search`, {
        // TODO
        type: this.state.searchOption,
        keyword: this.state.keyword,
      })
      .then(async function (res) {
        const { status, message, pages } = res.data;
        if (status) {
          that.setState({ pages });
        } else {
          Message.error(message);
        }
      })
      .catch(function (err) {
        console.error(err);
      });
  };

  async loadPagesFromServer() {
    try {
      this.setState({ loading: true });
      const res = await axios.get('/api/page');
      let { status, message, pages } = res.data;
      if (status) {
        pages.forEach((page) => {
          page.createdAt = getDate(page.createdAt);
          page.updatedAt = getDate(page.updatedAt);
        });
        this.setState({ pages });
        Message.success('数据加载完毕');
      } else {
        Message.error(message);
      }
      this.setState({ loading: false });
    } catch (e) {
      Message.error(e.message);
    }
  }

  editPage = (id) => {
    this.props.history.push(`/editor/${id}`);
  };

  viewPage = (link) => {
    window.location = `//${window.location.href.split('/')[2]}/page/${link}`;
  };

  exportPage = (id) => {
    window.location = `//${
      window.location.href.split('/')[2]
    }/api/page/export/${id}`;
  };

  getPageById = (id) => {
    for (let i = 0; i < this.state.pages.length; i++) {
      if (this.state.pages[i].id === id) {
        return [i, this.state.pages[i]];
      }
    }
    return [-1, undefined];
  };

  updateTargetPage = (index, page) => {
    if (index === -1) {
      return;
    }
    // https://stackoverflow.com/a/71530834
    let pages = [...this.state.pages];
    pages[index] = { ...page };
    this.setState({ pages }, ()=>{
      console.log(this.state.pages[index])
    });
  };

  deletePage = (id) => {
    const that = this;
    axios.delete(`/api/page/${id}`).then(async function (res) {
      const { status, message } = res.data;
      if (status) {
        let [i, page] = that.getPageById(id);
        if (i !== -1) {
          page.deleted = true;
          that.updateTargetPage(i, page);
          Message.success('删除成功');
        } else {
          Message.error('删除失败');
          console.error(id, i, page, that.state.pages);
        }
      } else {
        Message.error(message);
      }
    });
  };

  switchStatus = (id, key) => {
    const that = this;
    let pages = this.state.pages;
    let page = pages.find((x) => x.id === id);
    let base = 2;
    if (key === 'pageStatus') {
      base = 4;
    }
    page[key] = (page[key] + 1) % base;
    page.id = id;
    axios
      .put('/api/page/', page)
      .then(async function (res) {
        if (res.data.status) {
          let i = that.getPageById(id)[0];
          that.updateTargetPage(i, page);
          Message.success('更新成功');
        } else {
          Message.error(res.data.message);
        }
      })
      .catch(function (e) {
        Message.error(e.message);
      });
  };

  render() {
    return (
      <div className={'content-area'}>
        <h1>页面管理</h1>
        <Row justify="end" align="middle">
          <Col span={2} style={{ marginRight: '8px' }}>
            <Select
              options={PAGE_OPTIONS}
              defaultValue={-1}
              value={this.state.searchOption}
              onChange={this.onSearchOptionChange}
              style={{ width: '100%' }}
            />
          </Col>
          <Col span={8}>
            <Search
              placeholder='搜索页面 ...'
              size={'large'}
              value={this.state.keyword}
              onChange={this.searchPages}
              enterButton
            />
          </Col>
        </Row>

        <Table
          columns={this.columns}
          dataSource={this.state.pages}
          rowKey={'id'}
          style={{ marginTop: '16px' }}
          loading={this.state.loading}
          rowClassName={(record) => record.deleted && 'disabled-row'}
        />
      </div>
    );
  }
}

const mapStateToProps = (state) => {
  return state;
};

export default connect(mapStateToProps)(Posts);

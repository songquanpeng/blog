import React, { Component } from 'react';

import { connect } from 'react-redux';
import 'ace-builds/src-noconflict/mode-html';
import 'ace-builds/src-noconflict/snippets/html';
import 'ace-builds/src-noconflict/mode-javascript';
import 'ace-builds/src-noconflict/snippets/javascript';

import axios from 'axios';
import { message as Message, Button, Tabs, Form, Input } from 'antd';

import { PoweroffOutlined } from '@ant-design/icons';

const { TabPane } = Tabs;

const tabs = [
  {
    label: 'System',
    settings: [
      {
        key: 'domain',
        description: '',
      },
      {
        key: 'author',
        description: '',
      },
      {
        key: 'motto',
        description: '',
      },
      {
        key: 'port',
        description: '',
      },
      {
        key: 'language',
        description: '',
      },
      {
        key: 'favicon',
        description: '',
      },
      {
        key: 'copyright',
        description: '',
      },
    ],
  },
  {
    label: 'Third Party',
    settings: [
      {
        key: 'ad',
        description: '',
        isBlock: true,
      },
      {
        key: 'extra_header_code',
        description: 'For example you can insert google analytics code here.',
        isBlock: true,
      },
      {
        key: 'extra_footer_code',
        description: 'This code will be inserted into the body tag.',
      },
      {
        key: 'disqus',
        description: '',
      },
      {
        key: 'extra_footer_text',
        description: '',
      },
      {
        key: 'message_push_api',
        description: '',
      },
    ],
  },
  {
    label: 'Customize',
    settings: [
      {
        key: 'theme',
        description: '',
      },
      {
        key: 'code_theme',
        description: '',
      },
      {
        key: 'site_name',
        description: '',
      },
      {
        key: 'description',
        description: '',
      },
      {
        key: 'nav_links',
        description: '',
        isBlock: true,
      },
    ],
  },
];

class Settings extends Component {
  constructor(props) {
    super(props);
    this.state = {
      loading: true,
      submitLoading: false,
      language: 'javascript',
      options: {},
      optionIndex: 0,
    };
  }

  static getDerivedStateFromProps({ status }) {
    return { status };
  }

  async componentDidMount() {
    if (this.state.status === 0) {
      Message.error('Access denied.');
      this.props.history.push('/login');
      return;
    }
    await this.fetchData();
  }

  fetchData = async () => {
    try {
      this.setState({ loading: true });
      const res = await axios.get(`/api/option/`);
      let { status, message, options } = res.data;
      let temp = {};
      if (status) {
        options.forEach((option) => {
          temp[option.name] = option.value;
        });
        options = temp;
        console.log(options);
        this.setState({ options });
      } else {
        Message.error(message);
      }
      this.setState({ loading: false });
    } catch (e) {
      Message.error(e.message);
    }
  };

  updateOption = (key, value) => {
    let options = this.state.options;
    options[key] = value;
    this.setState({ options });
  };

  submit = async () => {
    let options = this.state.options;
    try {
      const res = await axios.post(`/api/option/`, options);
      const { status, message } = res.data;
      if (status) {
      } else {
        Message.error(message);
      }
      this.setState({ loading: false });
    } catch (e) {
      Message.error(e.message);
    } finally {
      this.setState({ submitLoading: false });
    }
  };

  shutdown = async (e) => {
    const res = await axios.get('/api/option/shutdown');
    const { message } = res.data;
    Message.error(message);
  };

  render() {
    return (
      <div className={'content-area'}>
        <h1>Settings</h1>{' '}
        <Button
          type="danger"
          icon={<PoweroffOutlined />}
          onClick={() => this.shutdown()}
        >
          Shutdown the server
        </Button>
        <div style={{ background: '#fff', padding: 16 }}>
          <Tabs tabPosition={'left'}>
            {tabs.map((tab) => {
              tab.settings.sort((a, b) => {
                if (a.key < b.key) {
                  return -1;
                }
                if (a.key > b.key) {
                  return 1;
                }
                return 0;
              });
              return (
                <TabPane tab={tab.label} key={tab.label}>
                  <Form layout={'vertical'}>
                    {tab.settings.map((setting) => {
                      setting.label = setting.key
                        .replaceAll('_', ' ')
                        .toUpperCase();
                      return (
                        <Form.Item
                          label={setting.label ? setting.label : setting.key}
                        >
                          {setting.isBlock ? (
                            <Input.TextArea
                              placeholder={setting.description}
                              value={this.state.options[setting.key]}
                              onChange={(e) => {
                                this.updateOption(setting.key, e.target.value);
                              }}
                              rows={10}
                            />
                          ) : (
                            <Input
                              placeholder={setting.description}
                              value={this.state.options[setting.key]}
                              onChange={(e) => {
                                this.updateOption(setting.key, e.target.value);
                              }}
                            />
                          )}
                        </Form.Item>
                      );
                    })}
                    <Button type="primary" onClick={() => this.submit()}>
                      Save
                    </Button>
                  </Form>
                </TabPane>
              );
            })}
          </Tabs>
        </div>
      </div>
    );
  }
}

const mapStateToProps = (state) => {
  return state;
};

export default connect(mapStateToProps)(Settings);

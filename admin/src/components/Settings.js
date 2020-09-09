import React, { Component } from 'react';

import { connect } from 'react-redux';
import AceEditor from 'react-ace';
import 'ace-builds/src-noconflict/mode-html';
import 'ace-builds/src-noconflict/snippets/html';
import 'ace-builds/src-noconflict/mode-javascript';
import 'ace-builds/src-noconflict/snippets/javascript';

import axios from 'axios';
import { message as Message, Button, Select, Divider } from 'antd';

import { PoweroffOutlined } from '@ant-design/icons';

class Settings extends Component {
  constructor(props) {
    super(props);
    this.state = {
      loading: true,
      submitLoading: false,
      language: 'javascript',
      options: [
        {
          key: 'optionName',
          value: 0,
          text: 'Option name',
          option_value: 'option_value',
          description: 'Option description will be displayed here.',
        },
      ],
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
      const { status, message, options } = res.data;
      if (status) {
        options.sort((a, b) => {
          if (a.name < b.name) {
            return -1;
          }
          if (a.name > b.name) {
            return 1;
          }
          return 0;
        });
        options.forEach((option, index) => {
          option.key = option.name;
          option.option_value = option.value;
          option.value = index;
          option.label = option.name.toUpperCase() + ': ' + option.description;
        });
        this.setState({ options });
      } else {
        Message.error(message);
      }
      this.setState({ loading: false });
    } catch (e) {
      Message.error(e.message);
    }
  };

  onInputChange = (value) => {
    let options = this.state.options;
    options[this.state.optionIndex].option_value = value;
    this.setState({ options });
  };

  onTypeChange = (e, { value }) => {
    let language = 'html';
    if (
      ['nav_links', 'allow_comments', 'port'].includes(
        this.state.options[value].name
      )
    ) {
      language = 'javascript';
    }
    this.setState({ optionIndex: value, language });
  };

  onSubmit = async (e) => {
    this.setState({ submitLoading: true });
    let option = this.state.options[this.state.optionIndex];
    option.value = option.option_value;
    try {
      const res = await axios.post(`/api/option/`, option);
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
    let option = this.state.options[this.state.optionIndex];
    if (option === undefined) {
      option = {
        key: 'optionName',
        value: 0,
        text: 'Option name',
        option_value: 'Error, try to reload this page.',
      };
    }
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
        <Divider />
        <div style={{ maxWidth: '900px' }}>
          <Select
            style={{ width: '100%' }}
            search
            label="Option Name"
            name={'name'}
            loading={this.state.loading}
            options={this.state.options}
            value={this.state.optionIndex}
            placeholder="Name"
            onChange={this.onTypeChange}
          />
          <AceEditor
            style={{
              width: '100%',
              height: '100%',
              minHeight: '400px',
              marginTop: '10px',
              marginBottom: '10px',
              border: '1px solid rgba(34,36,38,.15)',
            }}
            mode={this.state.language}
            fontSize={18}
            setOptions={{ useWorker: false }}
            label="Value"
            placeholder={option.description}
            name={option.name}
            value={option.option_value}
            rows={20}
            theme={'tomorrow'}
            onChange={this.onInputChange}
          />
          <Button
            block
            type="primary"
            onClick={this.onSubmit}
            loading={this.state.submitLoading}
          >
            Submit
          </Button>
        </div>
      </div>
    );
  }
}

const mapStateToProps = (state) => {
  return state;
};

export default connect(mapStateToProps)(Settings);

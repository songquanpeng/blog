import React, { Component } from 'react';
import sanitizeHtml from 'sanitize-html';
import {
  Button,
  Input,
  Space,
  Row,
  Col,
  Divider,
  message as Message,
} from 'antd';
import { UpOutlined } from '@ant-design/icons';
const { TextArea } = Input;

class RichTextEditor extends Component {
  constructor(props) {
    super(props);
    this.state = {
      content: '',
    };
    this.titleRef = React.createRef();
  }

  onChange = (e) => {
    // this.setState({ content: e.target.value });
  };

  onPaste = (e) => {
    let content = e.clipboardData.getData('text/html');
    this.setState({ content: content }); // TODO: it take too long to run.
  };

  clear = () => {
    this.setState({ content: '' });
  };

  copy = () => {
    navigator.clipboard
      .writeText(this.state.content)
      .then((r) => {
        Message.success('Copied.');
      })
      .catch((e) => {
        Message.error(e.message);
      });
  };

  removeStyle = () => {
    let content = this.state.content;
    content = sanitizeHtml(content, {
      allowedTags: sanitizeHtml.defaults.allowedTags.concat([
        'h1',
        'h2',
        'img',
      ]),
      allowedSchemes: ['http', 'https', 'ftp', 'mailto', 'data'],
    });
    content = content.replace(/^\s*\n/gm, '\n');
    this.setState({ content });
  };

  // TODO: Scroll to top not working.
  scrollTop = () => {
    this.titleRef.current.scrollTop = 0;
  };

  render() {
    return (
      <div ref={this.titleRef} className={'content-area'}>
        <h1>Rich Text Editor</h1>
        <Button
          className={'bottom-right'}
          shape="circle"
          type="primary"
          size="large"
          onClick={this.scrollTop}
          icon={<UpOutlined />}
        />
        <Space>
          <Button onClick={() => this.removeStyle()}>Remove Style</Button>
          <Button onClick={() => this.copy()}>Copy Content</Button>
          <Button onClick={() => this.clear()}>Clear Content</Button>
        </Space>
        <Divider />
        <Row style={{ minHeight: '100%' }}>
          <Col span={12}>
            <TextArea
              value={this.state.content}
              onPaste={this.onPaste}
              onChange={this.onChange}
              autoSize={{ minRows: 22 }}
            />
          </Col>
          <Col span={12} style={{ padding: '8px' }}>
            {/*<div dangerouslySetInnerHTML={{ __html: this.state.content }} />*/}
          </Col>
        </Row>
      </div>
    );
  }
}

export default RichTextEditor;

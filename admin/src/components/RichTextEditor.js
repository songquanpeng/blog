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

const { TextArea } = Input;

class RichTextEditor extends Component {
  constructor(props) {
    super(props);
    this.state = {
      content: '',
    };
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

  render() {
    return (
      <div className={'content-area'} style={{ minHeight: '80%' }}>
        <h1>Rich Text Editor</h1>
        <Space>
          <Button onClick={() => this.removeStyle()}>Remove Style</Button>
          <Button onClick={() => this.copy()}>Copy Content</Button>
          <Button onClick={() => this.clear()}>Clear</Button>
        </Space>
        <Divider />
        <Row style={{ minHeight: '100%' }}>
          <Col span={12}>
            <TextArea
              value={this.state.content}
              onPaste={this.onPaste}
              onChange={this.onChange}
              autoSize={{ minRows: 20 }}
            />
          </Col>
          <Col span={12} style={{ padding: '8px' }}>
            <div dangerouslySetInnerHTML={{ __html: this.state.content }} />
          </Col>
        </Row>
      </div>
    );
  }
}

export default RichTextEditor;

import React, { Component } from 'react';
import { connect } from 'react-redux';
import { setGlobalPortal } from '../../actions';
import fileDownload from 'js-file-download';
import axios from 'axios';

import {
  Container,
  Button,
  Icon,
  Card,
  Input,
  Segment,
  Message,
  Header
} from 'semantic-ui-react';

class File extends Component {
  constructor(props) {
    super(props);
    this.state = {
      loading: true,
      uploading: true,
      files: [],
      message: {
        visible: false,
        color: 'red',
        header: '',
        content: ''
      },
      searchTypingTimeout: 0
    };
    this.fileInputRef = React.createRef();
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
  }

  fetchData = async () => {
    try {
      this.setState({ loading: true });
      const res = await axios.get(`/api/file/`);
      const { status, message, files } = res.data;
      if (status) {
        this.setState({ files });
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

  onInputChange = e => {
    this.setState({ keyword: e.target.value });
    if (this.state.searchTypingTimeout) {
      clearTimeout(this.state.searchTypingTimeout);
    }
    this.setState({
      searchTypingTimeout: setTimeout(() => {
        this.search();
      }, 500)
    });
  };

  onFileInputChange = event => {
    this.setState({ uploading: true });
    let form = new FormData();
    form.append(`file`, event.target.files[0]);
    axios
      .post('/api/file/', form, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      })
      .then(res => {
        this.setState({ uploading: false });
        console.log(res);
        if (res && res.data) {
          if (res.data.status) {
            this.showMessage(
              'green',
              'Success',
              'You files have been uploaded'
            );
            this.fetchData().then(r => {});
          } else {
            this.showMessage('red', 'Failed to upload file', res.data.message);
          }
        }
      })
      .catch(err => {
        console.error(err);
        this.showMessage('red', 'Failed to upload file', err.toString());
      });
  };

  search = () => {
    this.setState({ loading: true });
    axios
      .post('/api/file/search', {
        keyword: this.state.keyword
      })
      .then(async res => {
        this.setState({ loading: false });
        this.setState({ files: res.data.files });
      })
      .catch(err => {
        console.error(err);
        this.setState({ loading: false });
        this.showMessage('red', 'Failed to query', err.toString());
      });
  };

  downloadFile = (id, filename) => {
    axios
      .get(`/upload/${id}`)
      .then(res => {
        fileDownload(res.data, filename);
      })
      .catch(err => {
        console.log(err);
        this.showMessage('red', 'Failed to download EML file', err.toString());
      });
  };

  deleteFile = id => {
    axios
      .delete(`/api/file/${id}`)
      .then(res => {
        if (res.data.status) {
          this.showMessage('green', 'Success', 'You files have been deleted');
          this.fetchData().then(r => {});
        } else {
          this.showMessage('red', 'Failed to delete file', res.data.message);
        }
      })
      .catch(err => {
        console.log(err);
        this.showMessage('red', 'Failed to download EML file', err.toString());
      });
  };

  showMessage = (color, header, content, hold = false) => {
    this.setState({
      message: {
        visible: true,
        color,
        header,
        content
      }
    });
    if (!hold) {
      setTimeout(this.closeMessage, 3000);
    }
  };

  closeMessage = () => {
    let { message } = this.state;
    message.visible = false;
    this.setState({ message });
  };

  renderBlank() {
    return (
      <Segment placeholder>
        <Header icon>
          <Icon name="x" />
          No satisfied items.
        </Header>
      </Segment>
    );
  }

  renderFileList() {
    const { files } = this.state;
    if (files.length === 0) {
      return this.renderBlank();
    }
    return (
      <Card.Group itemsPerRow={2}>
        {files.map(file => {
          return (
            <Card fluid={true} key={file.id}>
              <Card.Content>
                <Card.Header content={file.filename} />
                <Card.Meta content={file.path} />
                <Card.Description content={file.description} />
              </Card.Content>
              <Card.Content extra>
                <div className="ui two buttons">
                  <Button
                    basic
                    color="green"
                    onClick={() => this.downloadFile(file.id, file.filename)}
                  >
                    Download
                  </Button>
                  <Button
                    basic
                    color="red"
                    onClick={() => this.deleteFile(file.id)}
                  >
                    Delete
                  </Button>
                </div>
              </Card.Content>
            </Card>
          );
        })}
      </Card.Group>
    );
  }

  renderMessage() {
    const { message } = this.state;
    if (message.visible) {
      return (
        <Message
          color={message.color}
          header={message.header}
          content={message.content}
          onDismiss={this.closeMessage}
        />
      );
    }
  }

  render() {
    const { loading } = this.state;
    return (
      <Container>
        <Header as="h1" textAlign={'center'} style={{ paddingTop: '1em' }}>
          File Management
        </Header>
        <Input
          loading={loading}
          onChange={this.onInputChange}
          size="large"
          fluid={true}
          placeholder="Search files..."
          action
        >
          <input />
          <Button
            animated="vertical"
            onClick={() => {
              this.fileInputRef.current.click();
            }}
          >
            <Button.Content hidden>Upload</Button.Content>
            <Button.Content visible>
              <Icon name="upload" />
            </Button.Content>
          </Button>
        </Input>
        {this.renderMessage()}
        <Segment loading={loading}>{this.renderFileList()}</Segment>
        <input
          ref={this.fileInputRef}
          type="file"
          name="file"
          id="file"
          onChange={this.onFileInputChange}
          style={{ display: 'none' }}
        />
      </Container>
    );
  }
}

const mapStateToProps = state => {
  return state;
};

export default connect(mapStateToProps, { setGlobalPortal })(File);

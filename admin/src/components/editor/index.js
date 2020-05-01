import React, { Component } from 'react';
import AceEditor from 'react-ace';
import { connect } from 'react-redux';
import { setGlobalPortal } from '../../actions';
import 'ace-builds/src-noconflict/mode-markdown';
import 'ace-builds/src-noconflict/snippets/markdown';
import 'ace-builds/src-noconflict/mode-java';
import 'ace-builds/src-noconflict/snippets/java';
import 'ace-builds/src-noconflict/mode-python';
import 'ace-builds/src-noconflict/snippets/python';
import 'ace-builds/src-noconflict/mode-c_cpp';
import 'ace-builds/src-noconflict/snippets/c_cpp';
import 'ace-builds/src-noconflict/mode-javascript';
import 'ace-builds/src-noconflict/snippets/javascript';
import 'ace-builds/src-noconflict/mode-html';
import 'ace-builds/src-noconflict/snippets/html';
import 'ace-builds/src-noconflict/mode-sh';
import 'ace-builds/src-noconflict/snippets/sh';
import 'ace-builds/src-noconflict/mode-typescript';
import 'ace-builds/src-noconflict/snippets/typescript';
import 'ace-builds/src-noconflict/mode-css';
import 'ace-builds/src-noconflict/snippets/css';
import 'ace-builds/src-noconflict/mode-sql';
import 'ace-builds/src-noconflict/snippets/sql';
import 'ace-builds/src-noconflict/mode-golang';
import 'ace-builds/src-noconflict/snippets/golang';
import 'ace-builds/src-noconflict/mode-csharp';
import 'ace-builds/src-noconflict/snippets/csharp';

import axios from 'axios';
import {
  Grid,
  Button,
  Form,
  Checkbox,
  Icon,
  Divider,
  Confirm
} from 'semantic-ui-react';

const modes = [
  'markdown',
  'html',
  'java',
  'python',
  'c_cpp',
  'javascript',
  'sh',
  'typescript',
  'css',
  'sql',
  'golang',
  'csharp'
];

let languages = [];
modes.forEach(lang => {
  languages.push({ key: lang, text: lang, value: lang });
});

const editorThemes = [
  'monokai',
  'github',
  'tomorrow',
  'kuroir',
  'twilight',
  'xcode',
  'textmate',
  'solarized_dark',
  'solarized_light',
  'terminal'
];

editorThemes.forEach(theme =>
  require(`ace-builds/src-noconflict/theme-${theme}`)
);

let themes = [];
editorThemes.forEach(theme => {
  themes.push({ key: theme, text: theme, value: theme });
});

export const PAGE_OPTIONS = [
  { key: 'grey', text: 'ALL', value: -1 },
  { key: 'black', text: 'Article', value: 0 },
  { key: 'blue', text: 'Code', value: 1 },
  { key: 'orange', text: 'Bulletin', value: 2 },
  { key: 'olive', text: 'Discuss', value: 3 },
  { key: 'green', text: 'Links', value: 4 },
  { key: 'pink', text: 'Raw', value: 5 },
  { key: 'purple', text: 'Media', value: 6 },
  { key: 'violet', text: 'Timeline', value: 7 }
];

const PAGE_TYPE = {
  ARTICLE: 0,
  CODE: 1,
  BULLETIN: 2,
  DISCUSS: 3,
  LINKS: 4,
  CUSTOMIZE: 5,
  MEDIA: 6
};

class Editor extends Component {
  constructor(props) {
    super(props);
    this.state = {
      loading: false,
      theme: 'tomorrow',
      language: 'markdown',
      fontSize: 18,
      isNewPage: this.props.match.path === '/editor',
      originPage: undefined,
      page: {
        id: this.props.match.params.id,
        type: PAGE_TYPE.ARTICLE,
        link: '',
        page_status: 1,
        comment_status: 1,
        title: '',
        content: '---\ntitle: \ndescription: \ntags: \n- Others\n---\n',
        tag: '',
        password: '',
        description: ''
      },
      showRestoreConfirm: false,
      noUserInputContent: true,
      deleteConfirm: false
    };
    this.onChange = this.onChange.bind(this);
  }

  static getDerivedStateFromProps({ status }) {
    return { status };
  }

  async componentDidMount() {
    let editorContent = localStorage.getItem('editorContent');
    if (editorContent !== null && editorContent !== '') {
      if (this.state.isNewPage) {
        let page = { ...this.state.page };
        page.content = editorContent;
        this.setState({ page });
      } else {
        this.setState({ showRestoreConfirm: true });
      }
    }
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
    this.setState({ originPage: this.state.page });
    this.loadEditorConfig();
    if (!this.state.isNewPage) {
      await this.fetchData();
      this.adjustEditorLanguage(this.state.page.type);
    }
  }

  fetchData = async () => {
    try {
      this.setState({ loading: true });
      const res = await axios.get(`/api/page/${this.props.match.params.id}`);
      const { status, message, page } = res.data;
      if (status) {
        this.setState({ originPage: page, page });
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

  loadEditorConfig() {
    let theme = localStorage.getItem('theme');
    if (theme === null) {
      theme = this.state.theme;
    }
    let fontSize = localStorage.getItem('fontSize');
    if (fontSize === null) {
      fontSize = this.state.fontSize;
    }
    if (isNaN(fontSize)) {
      fontSize = 18;
    }
    this.setState({
      theme,
      fontSize: parseInt(fontSize)
    });
  }

  saveEditorConfig() {
    localStorage.setItem('theme', this.state.theme);
    localStorage.setItem('fontSize', this.state.fontSize);
  }

  handleCancel = () => {
    this.setState({ showRestoreConfirm: false });
    localStorage.setItem('editorContent', '');
  };

  handleConfirm = () => {
    this.setState({ showRestoreConfirm: false });
    let page = { ...this.state.page };
    page.content = localStorage.getItem('editorContent');
    this.setState({ page });
  };

  onChange(newValue) {
    let page = { ...this.state.page };
    page.content = newValue;
    localStorage.setItem('editorContent', page.content);
    let noUserInputContent = false;
    this.setState({ page, noUserInputContent });
  }

  onEditorBlur = () => {
    let page = { ...this.state.page };
    let content = page.content;
    let title = '';
    let tag = '';
    let description = '';
    let hasGetTitle = false;
    let readyToGetTags = false;
    let lines = content.split('\n');
    for (let i = 0; i < lines.length; ++i) {
      let line = lines[i];
      if (line.startsWith('description')) {
        description = line.substring(12).trim();
        continue;
      }
      if (!hasGetTitle && line.startsWith('title')) {
        title = line.substring(6).trim();
        hasGetTitle = true;
        continue;
      }
      if (!hasGetTitle) continue;
      if (!line.startsWith('tag') && !readyToGetTags) continue;
      if (!readyToGetTags) {
        readyToGetTags = true;
        continue;
      }

      if (line.startsWith('-') && !line.trim().endsWith('-')) {
        tag += ` ${line
          .trim()
          .substring(1)
          .trim()}`;
      } else {
        break;
      }
    }
    page.tag = tag.trim();
    page.title = title.trim();
    page.description = description;
    if (page.link === '') page.link = this.getValidLink(page.title);
    this.setState({ page });
  };

  onInputChange = e => {
    const { name, value } = e.target;
    let page = { ...this.state.page };
    if (name === 'link') {
      page[name] = this.getValidLink(value);
    } else {
      page[name] = value;
    }
    this.setState({ page });
  };

  onThemeChange = (e, { value }) => {
    this.setState({ theme: value }, () => {
      this.saveEditorConfig();
    });
  };

  onFontSizeChange = e => {
    const { value } = e.target;
    this.setState({ fontSize: parseInt(value) }, () => {
      this.saveEditorConfig();
    });
  };

  onTypeChange = (e, { value }) => {
    let page = { ...this.state.page };
    page.type = value;
    this.adjustEditorLanguage(value);
    this.setState({ page });
  };

  adjustEditorLanguage(pageType) {
    let language = this.state.language;
    switch (pageType) {
      case PAGE_TYPE.ARTICLE:
        language = 'markdown';
        break;
      case PAGE_TYPE.CUSTOMIZE:
        language = 'html';
        break;
      default:
        break;
    }
    this.setState({ language });
  }

  onLanguageChange = (e, { value }) => {
    this.setState({ language: value });
    if (this.state.noUserInputContent) {
      let page = { ...this.state.page };
      let content = '---\ntitle: \ndescription: \ntags: \n- Others\n---\n';
      if (
        [
          'java',
          'c_cpp',
          'javascript',
          'typescript',
          'css',
          'csharp',
          'golang',
          'sql'
        ].includes(value)
      ) {
        content = '/*\ntitle: \ndescription: \ntags: \n- Others\n*/\n';
      } else if (['html', 'ejs'].includes(value)) {
        content = '<!--\ntitle: \ndescription: \ntags: \n- Others\n-->\n';
      } else if (['python'].includes(value)) {
        content = '"""\ntitle: \ndescription: \ntags: \n- Others\n"""\n';
      } else if (['ruby'].includes(value)) {
        content = '=begin\ntitle: \ndescription: \ntags: \n- Others\n=end\n';
      }
      page.content = content;
      this.setState({ page });
    }
  };

  onCommentStatusChange = (e, { checked }) => {
    let page = { ...this.state.page };
    page.comment_status = checked ? 1 : 0;
    this.setState({ page });
  };

  onPageStatusChange = (e, { checked }) => {
    let page = { ...this.state.page };
    page.page_status = checked ? 1 : 0;
    this.setState({ page });
  };

  onSubmit = e => {
    this.onEditorBlur();
    if (this.state.page.link === '') {
      let page = { ...this.state.page };
      page.link = this.getValidLink();
      this.setState({ page }, () => {
        this.state.isNewPage ? this.postNewPage() : this.updatePage();
      });
    } else {
      this.state.isNewPage ? this.postNewPage() : this.updatePage();
    }
  };

  getDate(format) {
    if (format === undefined) format = 'yyyy-MM-dd hh:mm:ss';
    const date = new Date();
    const o = {
      'M+': date.getMonth() + 1,
      'd+': date.getDate(),
      'h+': date.getHours(),
      'm+': date.getMinutes(),
      's+': date.getSeconds(),
      S: date.getMilliseconds()
    };

    if (/(y+)/.test(format)) {
      format = format.replace(
        RegExp.$1,
        (date.getFullYear() + '').substr(4 - RegExp.$1.length)
      );
    }

    for (let k in o) {
      if (new RegExp('(' + k + ')').test(format)) {
        format = format.replace(
          RegExp.$1,
          RegExp.$1.length === 1
            ? o[k]
            : ('00' + o[k]).substr(('' + o[k]).length)
        );
      }
    }
    return format;
  }

  getValidLink(origin) {
    if (origin === undefined) {
      origin = this.getDate();
    }
    return origin.trim().replace(/[\s#%+/&=?`]+/g, '-');
  }

  reset = e => {
    let page = this.state.originPage;
    this.setState({ page });
  };

  onDeleteButtonClicked = () => {
    this.setState({ deleteConfirm: true });
  };

  deletePage = () => {
    this.setState({ deleteConfirm: false });
    const that = this;
    axios
      .delete(`/api/page/${this.props.match.params.id}`)
      .then(async function(res) {
        const { status, message } = res.data;
        if (status) {
          that.props.setGlobalPortal(
            true,
            'positive',
            'Success',
            'Your page has been deleted.'
          );
          that.props.history.push('/editor');
        } else {
          that.props.setGlobalPortal(true, 'negative', 'Failure', message);
        }
      });
  };

  cancelDelete = () => {
    this.setState({ deleteConfirm: false });
  };

  clearEditorStorage() {
    localStorage.setItem('editorContent', '');
  }

  updatePage() {
    const that = this;
    axios.put('/api/page', this.state.page).then(async function(res) {
      const { status, message } = res.data;
      if (status) {
        that.props.setGlobalPortal(
          true,
          'positive',
          'Success',
          'Your page has been updated.'
        );
        that.clearEditorStorage();
      } else {
        that.props.setGlobalPortal(true, 'negative', 'Failure', message);
      }
    });
  }

  postNewPage() {
    const that = this;
    axios.post('/api/page', this.state.page).then(async function(res) {
      const { status, message, id } = res.data;
      if (status) {
        let page = { ...that.state.page };
        page.id = id;
        that.setState({ isNewPage: false, page });
        that.props.setGlobalPortal(
          true,
          'positive',
          'Success',
          'Your page has been submitted.'
        );
        that.clearEditorStorage();
      } else {
        that.props.setGlobalPortal(true, 'negative', 'Failure', message);
      }
    });
  }

  renderEditor() {
    return (
      <>
        <AceEditor
          style={{ width: '100%', height: '100%' }}
          mode={this.state.language}
          theme={this.state.theme}
          name={'editor'}
          onChange={this.onChange}
          value={this.state.page.content}
          fontSize={this.state.fontSize}
          onBlur={this.onEditorBlur}
          setOptions={{ useWorker: false }}
        />
      </>
    );
  }

  renderForm() {
    return (
      <>
        <Form loading={this.state.loading}>
          <Form.Field>
            <label>Link</label>
            <input
              placeholder="Article link"
              name="link"
              value={this.state.page.link}
              onChange={this.onInputChange}
            />
          </Form.Field>
          <Form.Field>
            <label>Password</label>
            <input
              placeholder="Password"
              name="password"
              value={this.state.page.password}
              onChange={this.onInputChange}
            />
          </Form.Field>
          <Form.Field>
            <Form.Select
              fluid
              label="Page Type"
              name="type"
              options={PAGE_OPTIONS}
              value={this.state.page.type}
              placeholder="Type"
              onChange={this.onTypeChange}
            />
          </Form.Field>
          <Form.Field>
            <Checkbox
              slider
              name="comment_status"
              label="Allow comment"
              checked={this.state.page.comment_status === 1}
              onChange={this.onCommentStatusChange}
            />
          </Form.Field>
          <Form.Field>
            <Checkbox
              slider
              name="page_status"
              label="Publish page"
              checked={this.state.page.page_status === 1}
              onChange={this.onPageStatusChange}
            />
          </Form.Field>
          <Button
            color="red"
            animated="fade"
            onClick={this.onDeleteButtonClicked}
            disabled={this.state.isNewPage}
          >
            <Button.Content visible>Delete</Button.Content>
            <Button.Content hidden>
              <Icon name="delete" />
            </Button.Content>
          </Button>
          <Button
            type="reset"
            color="yellow"
            animated="fade"
            onClick={this.reset}
          >
            <Button.Content visible>Reset</Button.Content>
            <Button.Content hidden>
              <Icon name="undo" />
            </Button.Content>
          </Button>
          <Button
            type="submit"
            color="green"
            animated="fade"
            onClick={this.onSubmit}
          >
            <Button.Content visible>Submit</Button.Content>
            <Button.Content hidden>
              <Icon name="save" />
            </Button.Content>
          </Button>
          <Divider />
          <Form.Field>
            <Form.Select
              fluid
              label="Code Language"
              name="language"
              options={languages}
              value={this.state.language}
              placeholder="Language"
              onChange={this.onLanguageChange}
            />
          </Form.Field>
          <Form.Field>
            <Form.Select
              fluid
              label="Editor Theme"
              name="theme"
              options={themes}
              value={this.state.theme}
              placeholder="Theme"
              onChange={this.onThemeChange}
            />
          </Form.Field>
          <Form.Field>
            <label>Font Size</label>
            <input
              placeholder="18"
              name="font_size"
              type="number"
              min="1"
              value={this.state.fontSize}
              onChange={this.onFontSizeChange}
            />
          </Form.Field>
        </Form>
      </>
    );
  }

  render() {
    return (
      <>
        <Grid celled style={{ height: '88%' }}>
          <Grid.Row>
            <Grid.Column width={3}>{this.renderForm()}</Grid.Column>
            <Grid.Column width={13} style={{ padding: '0' }}>
              {this.renderEditor()}
            </Grid.Column>
          </Grid.Row>
        </Grid>
        <Confirm
          open={this.state.showRestoreConfirm}
          header="We find some unsaved content"
          content="Would you like to restore it?"
          cancelButton="Cancel"
          confirmButton="Restore"
          onConfirm={this.handleConfirm}
          onCancel={this.handleCancel}
        />
        <Confirm
          open={this.state.deleteConfirm}
          header="Warning"
          content="Are you sure delete this page?"
          cancelButton="Cancel"
          confirmButton="Delete"
          onConfirm={this.deletePage}
          onCancel={this.cancelDelete}
        />
      </>
    );
  }
}

const mapStateToProps = state => {
  return state;
};

export default connect(
  mapStateToProps,
  { setGlobalPortal }
)(Editor);

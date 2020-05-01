import React, { Component } from 'react';
import { connect } from 'react-redux';
import { setGlobalPortal } from '../../actions';
import AceEditor from 'react-ace';
import 'ace-builds/src-noconflict/mode-html';
import 'ace-builds/src-noconflict/snippets/html';
import 'ace-builds/src-noconflict/mode-javascript';
import 'ace-builds/src-noconflict/snippets/javascript';
import 'ace-builds/src-noconflict/theme-solarized_light';

import axios from 'axios';
import {
  Grid,
  Container,
  Select,
  Button,
  Icon,
  Divider,
  Card
} from 'semantic-ui-react';

class System extends Component {
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
          description: 'Option description will be displayed here.'
        }
      ],
      optionIndex: 0
    };
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
          option.text = option.name.toUpperCase();
        });
        this.setState({ options });
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

  onInputChange = value => {
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

  onSubmit = async e => {
    this.setState({ submitLoading: true });
    let option = this.state.options[this.state.optionIndex];
    option.value = option.option_value;
    try {
      const res = await axios.post(`/api/option/`, option);
      const { status, message } = res.data;
      if (status) {
      } else {
        this.props.setGlobalPortal(true, 'negative', 'Failed', message);
      }
      this.setState({ loading: false });
    } catch (e) {
      this.props.setGlobalPortal(
        true,
        'negative',
        'Network error',
        e.toString()
      );
    } finally {
      this.setState({ submitLoading: false });
    }
  };

  shutdown = async e => {
    const res = await axios.get('/api/option/shutdown');
    const { status, message } = res.data;
    if (status) {
      this.props.setGlobalPortal(true, 'negative', 'Error', message);
    } else {
      this.props.setGlobalPortal(true, 'negative', 'Error', message);
    }
  };

  render() {
    let option = this.state.options[this.state.optionIndex];
    if (option === undefined) {
      option = {
        key: 'optionName',
        value: 0,
        text: 'Option name',
        option_value: 'Error, try to reload this page.'
      };
      console.log(this.state);
    }
    return (
      <>
        <Container>
          <Grid columns="equal" style={{ height: '88%', marginTop: '2px' }}>
            <Grid.Row>
              <Grid.Column width={3}>
                <Card>
                  <Card.Content>
                    <Card.Header>Control Panel</Card.Header>
                  </Card.Content>
                  <Card.Content extra>
                    <Button color="blue" animated="fade" fluid>
                      <Button.Content visible>Export data</Button.Content>
                      <Button.Content hidden>
                        <Icon name="download" />
                      </Button.Content>
                    </Button>
                    <Divider />
                    <Button
                      color="red"
                      animated="fade"
                      onClick={this.shutdown}
                      fluid
                    >
                      <Button.Content visible>Shutdown server</Button.Content>
                      <Button.Content hidden>
                        <Icon name="shutdown" />
                      </Button.Content>
                    </Button>
                  </Card.Content>
                </Card>
              </Grid.Column>
              <Grid.Column width={13}>
                <Select
                  fluid
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
                    border: '1px solid rgba(34,36,38,.15)'
                  }}
                  mode={this.state.language}
                  fontSize={18}
                  setOptions={{ useWorker: false }}
                  label="Value"
                  placeholder={option.description}
                  name={option.name}
                  value={option.option_value}
                  rows={20}
                  theme={'solarized_light'}
                  onChange={this.onInputChange}
                />
                <Button
                  color="green"
                  animated="fade"
                  fluid
                  onClick={this.onSubmit}
                  loading={this.state.submitLoading}
                >
                  Submit
                </Button>
              </Grid.Column>
            </Grid.Row>
          </Grid>
        </Container>
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
)(System);

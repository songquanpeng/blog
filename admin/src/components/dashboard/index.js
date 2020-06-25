import React from 'react';
import axios from 'axios';
import _ from 'lodash';
import {
  Container,
  Dropdown,
  Input,
  Card,
  Segment,
  Button,
  Menu,
  Icon,
  Header,
  Label
} from 'semantic-ui-react';

import { setGlobalPortal } from '../../actions';
import { connect } from 'react-redux';
import { PAGE_OPTIONS } from '../editor';

class DashBoard extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      pages: [],
      loading: false,
      searchTypingTimeout: 0,
      searchOption: -1,
      asBuyer: true,
      keyword: '',
      activeItem: '',
      direction: 'up',
      status: 0
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
    await this.loadPagesFromServer();
  }

  onSearchOptionChange = (e, { value }) => {
    this.setState({ searchOption: value }, () => {
      this.search();
    });
  };

  searchPages = e => {
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

  search = () => {
    const that = this;
    axios
      .post(`/api/page/search`, {
        // TODO
        type: this.state.searchOption,
        keyword: this.state.keyword
      })
      .then(async function(res) {
        const { status, message, pages } = res.data;
        if (status) {
          that.setState({ pages });
        } else {
          that.props.setGlobalPortal(true, 'negative', 'Failure', message);
        }
      })
      .catch(function(err) {
        console.error(err);
      });
  };

  async loadPagesFromServer() {
    try {
      this.setState({ loading: true });
      const res = await axios.get('/api/page');
      let { status, message, pages } = res.data;
      if (status) {
        pages = _.sortBy(pages, ['edit_time']).reverse();
        this.setState({ pages });
      } else {
        this.props.setGlobalPortal(true, 'negative', 'Failure', message);
      }
      this.setState({ loading: false });
    } catch (e) {
      this.props.setGlobalPortal(true, 'negative', 'Failure', e.message);
    }
  }

  onEditButtonClicked = id => {
    this.props.history.push(`/editor/${id}`);
  };

  onViewButtonClicked = link => {
    window.location = `//${window.location.href.split('/')[2]}/page/${link}`;
  };

  onExportButtonClicked = id => {
    window.location = `//${
      window.location.href.split('/')[2]
    }/api/page/export/${id}`;
  };

  deletePage = id => {
    const that = this;
    axios.delete(`/api/page/${id}`).then(async function(res) {
      const { status, message } = res.data;
      if (status) {
        that.props.setGlobalPortal(
          true,
          'positive',
          'Success',
          'Your page has been deleted.'
        );
        await that.loadPagesFromServer();
      } else {
        that.props.setGlobalPortal(true, 'negative', 'Failure', message);
      }
    });
  };

  setPageState = (id, key) => {
    const that = this;
    let pages = this.state.pages;
    let page = pages.find(x => x.page_id === id);
    page[key] = (page[key] + 1) % 2;
    page.id = id;
    axios
      .post('/api/page/', page)
      .then(async function(res) {
        if (res.data.status) {
          await that.loadPagesFromServer();
        } else {
          that.props.setGlobalPortal(
            true,
            'negative',
            'Failure',
            res.data.message
          );
        }
      })
      .catch(function(err) {
        console.error(err);
      });
  };

  onMenuClick = (e, { name }) => {
    const { activeItem, direction, pages } = this.state;

    if (name !== activeItem) {
      this.setState({
        activeItem: name,
        direction: 'angle up',
        pages: _.sortBy(pages, [name])
      });
    } else {
      this.setState({
        pages: pages.reverse(),
        direction: direction === 'angle up' ? 'angle down' : 'angle up'
      });
    }
  };

  renderBlank() {
    return (
      <Segment placeholder>
        <Header icon>
          <Icon name="x" />
          No page.
        </Header>
      </Segment>
    );
  }

  renderList() {
    const { pages } = this.state;
    if (pages.length === 0) {
      return this.renderBlank();
    }
    return (
      <Card.Group itemsPerRow={2}>
        {pages.map(page => {
          return (
            <Card
              fluid
              key={page.page_id}
              color={PAGE_OPTIONS[page.type + 1].key}
            >
              <Card.Content>
                <Card.Header>
                  <Label
                    attached="top right"
                    color={PAGE_OPTIONS[page.type + 1].key}
                  >
                    {PAGE_OPTIONS[page.type + 1].text}
                  </Label>
                  {page.title !== '' ? page.title : 'No title'}
                </Card.Header>
                <Card.Meta>{page.tag !== '' ? page.tag : 'No tag'}</Card.Meta>
                <Card.Description>
                  {`【Post on: ${page.post_time}】【Last edit: ${page.edit_time}】【Views: ${page.view}】【Up vote: ${page.up_vote}】【Down vote: ${page.down_vote}】`}
                </Card.Description>
              </Card.Content>
              <Card.Content extra>
                <div className="ui five buttons">
                  <Button
                    basic
                    color="green"
                    onClick={() => this.onViewButtonClicked(page.link)}
                  >
                    View
                  </Button>
                  <Button
                    basic
                    color="orange"
                    onClick={() => this.onExportButtonClicked(page.page_id)}
                  >
                    Export
                  </Button>
                  <Button
                    basic
                    color="violet"
                    onClick={() => this.onEditButtonClicked(page.page_id)}
                  >
                    Edit
                  </Button>
                  <Button
                    basic
                    color="purple"
                    onClick={() =>
                      this.setPageState(page.page_id, 'page_status')
                    }
                  >
                    {page.page_status === 1 ? 'Recall' : 'Publish'}
                  </Button>
                  <Button
                    basic
                    color="pink"
                    onClick={() =>
                      this.setPageState(page.page_id, 'comment_status')
                    }
                  >
                    {page.comment_status === 1
                      ? 'Disable Comment'
                      : 'Enable Comment'}
                  </Button>
                </div>
              </Card.Content>
            </Card>
          );
        })}
      </Card.Group>
    );
  }

  renderFilter() {
    const items = [
      // TODO: add more
      'title',
      'post_time',
      'edit_time',
      'author',
      'page_status',
      'comment_status'
    ];
    const { activeItem, direction } = this.state;
    return (
      <Menu secondary>
        {_.map(items, item => (
          <Menu.Item
            key={item}
            icon={activeItem === item ? direction : null}
            name={item}
            active={activeItem === item}
            onClick={this.onMenuClick}
          />
        ))}
        <Menu.Menu position="right">
          <Menu.Item>
            <Input
              size="large"
              label={
                <Dropdown
                  value={this.state.searchOption}
                  options={PAGE_OPTIONS}
                  onChange={this.onSearchOptionChange}
                />
              }
              value={this.state.keyword}
              labelPosition="left"
              icon="search"
              placeholder='Press "Enter" to search...'
              onChange={this.searchPages}
            />
          </Menu.Item>
        </Menu.Menu>
      </Menu>
    );
  }

  render() {
    return (
      <Container style={{ marginTop: '10px' }}>
        {this.renderFilter()}
        <Segment vertical loading={this.state.loading}>
          {this.renderList()}
        </Segment>
      </Container>
    );
  }
}

const mapStateToProps = state => {
  return state;
};

export default connect(mapStateToProps, { setGlobalPortal })(DashBoard);

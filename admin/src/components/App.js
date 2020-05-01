import React from 'react';
import { HashRouter, Route, Switch } from 'react-router-dom';
import { connect } from 'react-redux';
import { getStatus } from '../actions';

import 'semantic-ui-css/semantic.min.css';
import { Container } from 'semantic-ui-react';
import Header from './Header';
import ScrollToTop from './ScrollToTop';
import Editor from './editor';
import User from './user';
import System from './system';
import EditUser from './user/EditUser';
import DashBoard from './dashboard';
import Login from './login';

class App extends React.Component {
  componentDidMount = () => {
    this.props.getStatus();
  };

  render() {
    return (
      <HashRouter>
        <ScrollToTop>
          <Container fluid style={{ height: '100%' }}>
            <Route path="/" component={Header} />
            <Switch>
              <Route path="/" exact component={DashBoard} />
              <Route path="/dashboard" exact component={DashBoard} />
              <Route path="/editor" exact component={Editor} />
              <Route path="/editor/:id" exact component={Editor} />
              <Route path="/system" exact component={System} />
              <Route path="/user" exact component={User} />
              <Route path="/user/new" exact component={EditUser} />
              <Route path="/user/:id" exact component={EditUser} />
              <Route path="/login" exact component={Login} />
            </Switch>
          </Container>
        </ScrollToTop>
      </HashRouter>
    );
  }
}

export default connect(
  null,
  { getStatus }
)(App);

import React from 'react';
import { Link } from 'react-router-dom';
import { connect } from 'react-redux';
import { Menu, Container, Icon, Sticky } from 'semantic-ui-react';

import { logout, setGlobalPortal } from '../actions';

class Header extends React.Component {
  state = { activeItem: 'dashboard', status: 2, userId: -1, userState: 1 };

  componentDidMount() {
    this.setState({
      activeItem: this.props.location.pathname.split('/')[1]
    });
  }

  static getDerivedStateFromProps(props) {
    return {
      status: props.status,
      userId: props.user.userId,
      userState: props.user.userState
    };
  }

  handleItemClick = (e, { name }) => {
    this.setState({ activeItem: name });
  };

  onLogoutClick = async () => {
    const message = await this.props.logout();
    this.props.setGlobalPortal(true, 'info', 'success', message);
    this.props.history.push('/login');
  };

  renderLoginOrLogout = () => {
    const { activeItem } = this.state;

    if (this.state.status === 1) {
      return <Menu.Item name="logout" onClick={this.onLogoutClick} />;
    } else {
      return (
        <Menu.Item
          name="login"
          as={Link}
          to="/login"
          active={activeItem === 'login'}
          onClick={this.handleItemClick}
        />
      );
    }
  };

  render() {
    const { activeItem } = this.state;
    return (
      <Sticky>
        <Menu size="massive" stackable>
          <Container>
            <Menu.Item
              as={Link}
              to="/"
              name="dashboard"
              onClick={this.handleItemClick}
            >
              <Icon name="home" />
              Lightx CMS Admin
            </Menu.Item>
            <Menu.Item
              as={Link}
              to="/dashboard"
              name="dashboard"
              active={activeItem === 'dashboard'}
              onClick={this.handleItemClick}
            />
            <Menu.Item
              as={Link}
              to="/editor"
              name="editor"
              active={activeItem === 'editor'}
              onClick={this.handleItemClick}
            />
            <Menu.Item
              as={Link}
              to={'/user'}
              name="user"
              active={activeItem === 'user'}
              onClick={this.handleItemClick}
            />
            <Menu.Item
              as={Link}
              to={'/system'}
              name="system"
              active={activeItem === 'system'}
              onClick={this.handleItemClick}
            />
            <Menu.Item
              as={Link}
              to={'/file'}
              name="file"
              active={activeItem === 'file'}
              onClick={this.handleItemClick}
            />
            <Menu.Menu position="right">{this.renderLoginOrLogout()}</Menu.Menu>
          </Container>
        </Menu>
      </Sticky>
    );
  }
}

const mapStateToProps = state => {
  return state;
};

export default connect(
  mapStateToProps,
  { logout, setGlobalPortal }
)(Header);

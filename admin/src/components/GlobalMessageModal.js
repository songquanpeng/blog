import React from 'react';
import { connect } from 'react-redux';
import { Message, Transition, TransitionablePortal } from 'semantic-ui-react';
import { setGlobalPortal } from '../actions';

class GlobalMessageModal extends React.Component {
  state = { open: true, color: 'negative' };

  handleClose = () => this.props.setGlobalPortal(false);

  static getDerivedStateFromProps(props) {
    const { open, color, header, body } = props;
    if (open) {
      setTimeout(() => {
        props.setGlobalPortal(false);
      }, 3000);
    }
    return {
      open,
      color: color,
      header: header,
      body: body
    };
  }

  render() {
    const { open, color, header, body } = this.state;
    return (
      <Transition visiable={open} animation="swing right" duration={200}>
        <TransitionablePortal onClose={this.handleClose} open={open}>
          <Message
            {...{ [color]: true }}
            style={{
              position: 'fixed',
              left: '30%',
              right: '30%',
              top: '10%',
              zIndex: 1000
            }}
          >
            <Message.Header>{header}</Message.Header>
            <p>{body}</p>
          </Message>
        </TransitionablePortal>
      </Transition>
    );
  }
}

const mapStateToProps = state => {
  return state.portal;
};

export default connect(
  mapStateToProps,
  { setGlobalPortal }
)(GlobalMessageModal);

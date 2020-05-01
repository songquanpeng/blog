import React from 'react';
import ReactDOM from 'react-dom';
import { createStore, applyMiddleware } from 'redux';
import reduxThunk from 'redux-thunk';
import { Provider } from 'react-redux';
import App from './components/App';
import GlobalMessagePortal from './components/GlobalMessageModal';
import reducers from './reducers';

const store = createStore(reducers, applyMiddleware(reduxThunk));

ReactDOM.render(
  <Provider store={store}>
    <GlobalMessagePortal />
    <App />
  </Provider>,
  document.getElementById('root')
);

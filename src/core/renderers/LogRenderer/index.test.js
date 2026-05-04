import React from 'react';
import ReactDOM from 'react-dom';
import { act } from 'react-dom/test-utils';
import LogRenderer from './index';

jest.mock('components', () => {
  const React = require('react');

  return {
    Ellipsis: ({ className, children }) => React.createElement('div', { className }, children),
  };
});

describe('LogRenderer', () => {
  let container;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    ReactDOM.unmountComponentAtNode(container);
    container.remove();
    container = null;
  });

  it('renders log output as escaped text', () => {
    const log = '<img src=x onerror=alert(1)>line\nnext';

    act(() => {
      ReactDOM.render(<LogRenderer title="Console" data={{ log }} />, container);
    });

    const content = container.querySelector('.content');
    expect(content.textContent).toBe(log);
    expect(content.querySelector('img')).toBeNull();
  });
});

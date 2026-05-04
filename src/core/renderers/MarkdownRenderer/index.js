import React from 'react';
import { Renderer } from 'core/renderers';
import styles from './MarkdownRenderer.module.scss';
import ReactMarkdown from 'react-markdown';

class MarkdownRenderer extends Renderer {
  renderData() {
    const { markdown } = this.props.data;

    const heading = ({ level, children, ...rest }) => {
      const HeadingComponent = [
        'h1',
        'h2',
        'h3',
        'h4',
        'h5',
        'h6',
      ][level - 1];

      const idfy = text => text.toLowerCase().trim().replace(/[^\w -]/g, '').replace(/ /g, '-');

      const getText = children => {
        return React.Children.map(children, child => {
          if (!child) return '';
          if (typeof child === 'string') return child;
          if ('props' in child) return getText(child.props.children);
          return '';
        }).join('');
      };

      const id = idfy(getText(children));

      return React.createElement(HeadingComponent, { id, ...rest }, children);
    };

    const link = ({ href, children, ...rest }) => {
      return /^#/.test(href) ? (
        <a href={href} {...rest}>{children}</a>
      ) : (
        <a href={href} rel="noopener noreferrer" target="_blank" {...rest}>{children}</a>
      );
    };

    const image = ({ src, alt = '', ...rest }) => {
      let newSrc = src;
      let style = { maxWidth: '100%' };
      const CODECOGS = 'https://latex.codecogs.com/svg.latex?';
      const WIKIMEDIA_IMAGE = 'https://upload.wikimedia.org/wikipedia/';
      const WIKIMEDIA_MATH = 'https://wikimedia.org/api/rest_v1/media/math/render/svg/';
      if (src.startsWith(CODECOGS)) {
        const latex = src.substring(CODECOGS.length);
        newSrc = `${CODECOGS}\\color{White}${latex}`;
      } else if (src.startsWith(WIKIMEDIA_IMAGE)) {
        style.backgroundColor = 'white';
      } else if (src.startsWith(WIKIMEDIA_MATH)) {
        style.filter = 'invert(100%)';
      }
      return <img src={newSrc} alt={alt} style={style} {...rest} />;
    };

    return (
      <div className={styles.markdown}>
        <ReactMarkdown className={styles.content} source={markdown} renderers={{ heading, link, image }}
                       escapeHtml={false}/>
      </div>
    );
  }
}

export default MarkdownRenderer;

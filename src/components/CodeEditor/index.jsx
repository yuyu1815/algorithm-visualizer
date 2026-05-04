import React from 'react';
import faTrashAlt from '@fortawesome/fontawesome-free-solid/faTrashAlt';
import faUser from '@fortawesome/fontawesome-free-solid/faUser';
import { classes, extension } from 'common/util';
import { actions } from 'reducers';
import { connect } from 'react-redux';
import { languages } from 'common/config';
import { Button, Ellipsis, FoldableAceEditor } from 'components';
import { translate } from 'i18n';
import styles from './CodeEditor.module.scss';

class CodeEditor extends React.Component {
  constructor(props) {
    super(props);

    this.aceEditorRef = React.createRef();
  }

  handleResize() {
    this.aceEditorRef.current.resize();
  }

  render() {
    const { className } = this.props;
    const { editingFile } = this.props.current;
    const { locale, user } = this.props.env;
    const { lineIndicator } = this.props.player;
    const t = (key, values) => translate(locale, key, values);

    if (!editingFile) return null;

    const fileExt = extension(editingFile.name);
    const language = languages.find(language => language.ext === fileExt);
    const contributors = editingFile.contributors || [user || { login: 'guest', label: t('codeEditor.guest'), avatar_url: faUser }];
    const mode = language ? language.mode :
      fileExt === 'md' ? 'markdown' :
        fileExt === 'json' ? 'json' :
          'plain_text';

    return (
      <div className={classes(styles.code_editor, className)}>
        <FoldableAceEditor
          className={styles.ace_editor}
          ref={this.aceEditorRef}
          mode={mode}
          theme="tomorrow_night_eighties"
          name="code_editor"
          editorProps={{ $blockScrolling: true }}
          onChange={code => this.props.modifyFile(editingFile, code)}
          markers={lineIndicator ? [{
            startRow: lineIndicator.lineNumber,
            startCol: 0,
            endRow: lineIndicator.lineNumber,
            endCol: Infinity,
            className: styles.current_line_marker,
            type: 'line',
            inFront: true,
            _key: lineIndicator.cursor,
          }] : []}
          value={editingFile.content}/>
        <div className={classes(styles.contributors_viewer, className)}>
          <span className={classes(styles.contributor, styles.label)}>{t('codeEditor.contributedBy')}</span>
          {
            contributors.map(contributor => (
              <Button className={styles.contributor} icon={contributor.avatar_url} key={contributor.login}
                      href={`https://github.com/${contributor.login}`}>
                {contributor.label || contributor.login}
              </Button>
            ))
          }
          <div className={styles.empty}>
            <div className={styles.empty}/>
            <Button className={styles.delete} icon={faTrashAlt} primary confirmNeeded
                    confirmText={t('common.clickToConfirm')}
                    onClick={() => this.props.deleteFile(editingFile)}>
              <Ellipsis>{t('codeEditor.deleteFile')}</Ellipsis>
            </Button>
          </div>
        </div>
      </div>
    );
  }
}

export default connect(({ current, env, player }) => ({ current, env, player }), actions, null, { forwardRef: true })(
  CodeEditor,
);

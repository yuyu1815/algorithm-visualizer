import React from 'react';
import Cookies from 'js-cookie';
import { connect } from 'react-redux';
import Promise from 'bluebird';
import { Helmet } from 'react-helmet';
import queryString from 'query-string';
import {
  BaseComponent,
  CodeEditor,
  Header,
  Navigator,
  ResizableContainer,
  TabContainer,
  ToastContainer,
  VisualizationViewer,
} from 'components';
import { AlgorithmApi, GitHubApi, VisualizationApi } from 'apis';
import { actions } from 'reducers';
import { createUserFile, extension, refineGist } from 'common/util';
import { exts, languages } from 'common/config';
import { SCRATCH_PAPER_README_MD } from 'files';
import { translate, translateDescription, translateTitle } from 'i18n';
import styles from './App.module.scss';

class App extends BaseComponent {
  constructor(props) {
    super(props);

    this.state = {
      workspaceVisibles: [true, true, true],
      workspaceWeights: [1, 2, 2],
    };

    this.codeEditorRef = React.createRef();

    this.ignoreHistoryBlock = this.ignoreHistoryBlock.bind(this);
    this.handleClickTitleBar = this.handleClickTitleBar.bind(this);
    this.loadScratchPapers = this.loadScratchPapers.bind(this);
    this.handleChangeWorkspaceWeights = this.handleChangeWorkspaceWeights.bind(this);
  }

  componentDidMount() {
    window.signIn = this.signIn.bind(this);
    window.signOut = this.signOut.bind(this);

    const { params } = this.props.match;
    const { search } = this.props.location;
    this.loadAlgorithm(params, queryString.parse(search));

    const accessToken = Cookies.get('access_token');
    if (accessToken) this.signIn(accessToken);

    AlgorithmApi.getCategories()
      .then(({ categories }) => this.props.setCategories(categories))
      .catch(this.handleError);

    this.toggleHistoryBlock(true);
  }

  componentWillUnmount() {
    delete window.signIn;
    delete window.signOut;

    this.toggleHistoryBlock(false);
  }

  componentDidUpdate(prevProps) {
    const { params } = this.props.match;
    const { search } = this.props.location;
    if (params !== prevProps.match.params || search !== prevProps.location.search) {
      const { categoryKey, algorithmKey, gistId } = params;
      const { algorithm, scratchPaper } = this.props.current;
      if (algorithm && algorithm.categoryKey === categoryKey && algorithm.algorithmKey === algorithmKey) return;
      if (scratchPaper && scratchPaper.gistId === gistId) return;
      this.loadAlgorithm(params, queryString.parse(search));
    }
  }

  toggleHistoryBlock(enable = !this.unblock) {
    if (enable) {
      window.onbeforeunload = () => {
        const { saved } = this.props.current;
        if (!saved) return translate(this.props.env.locale, 'app.discardChanges');
      };
      this.unblock = this.props.history.block((location) => {
        if (location.pathname === this.props.location.pathname) return;
        const { saved } = this.props.current;
        if (!saved) return translate(this.props.env.locale, 'app.discardChanges');
      });
    } else {
      window.onbeforeunload = undefined;
      this.unblock();
      this.unblock = undefined;
    }
  }

  ignoreHistoryBlock(process) {
    this.toggleHistoryBlock(false);
    process();
    this.toggleHistoryBlock(true);
  }

  signIn(accessToken) {
    Cookies.set('access_token', accessToken);
    GitHubApi.auth(accessToken)
      .then(() => GitHubApi.getUser())
      .then(user => {
        const { login, avatar_url } = user;
        this.props.setUser({ login, avatar_url });
      })
      .then(() => this.loadScratchPapers())
      .catch(() => this.signOut());
  }

  signOut() {
    Cookies.remove('access_token');
    GitHubApi.auth(undefined)
      .then(() => {
        this.props.setUser(undefined);
      })
      .then(() => this.props.setScratchPapers([]));
  }

  loadScratchPapers() {
    const per_page = 100;
    const paginateGists = (page = 1, scratchPapers = []) => GitHubApi.listGists({
      per_page,
      page,
      timestamp: Date.now(),
    }).then(gists => {
      scratchPapers.push(...gists.filter(gist => 'algorithm-visualizer' in gist.files).map(gist => ({
        key: gist.id,
        name: gist.description,
        files: Object.keys(gist.files),
      })));
      if (gists.length < per_page) {
        return scratchPapers;
      } else {
        return paginateGists(page + 1, scratchPapers);
      }
    });
    return paginateGists()
      .then(scratchPapers => this.props.setScratchPapers(scratchPapers))
      .catch(this.handleError);
  }

  loadAlgorithm({ categoryKey, algorithmKey, gistId }, { visualizationId }) {
    const { ext } = this.props.env;
    const fetch = () => {
      if (window.__PRELOADED_ALGORITHM__) {
        this.props.setAlgorithm(window.__PRELOADED_ALGORITHM__);
        delete window.__PRELOADED_ALGORITHM__;
      } else if (window.__PRELOADED_ALGORITHM__ === null) {
        delete window.__PRELOADED_ALGORITHM__;
        return Promise.reject(new Error(translate(this.props.env.locale, 'errors.algorithmNotFound')));
      } else if (categoryKey && algorithmKey) {
        return AlgorithmApi.getAlgorithm(categoryKey, algorithmKey)
          .then(({ algorithm }) => this.props.setAlgorithm(algorithm));
      } else if (gistId === 'new' && visualizationId) {
        return VisualizationApi.getVisualization(visualizationId)
          .then(content => {
            this.props.setScratchPaper({
              login: undefined,
              gistId,
              title: 'Untitled',
              files: [SCRATCH_PAPER_README_MD, createUserFile('visualization.json', JSON.stringify(content))],
            });
          });
      } else if (gistId === 'new') {
        const language = languages.find(language => language.ext === ext);
        this.props.setScratchPaper({
          login: undefined,
          gistId,
          title: 'Untitled',
          files: [SCRATCH_PAPER_README_MD, language.skeleton],
        });
      } else if (gistId) {
        return GitHubApi.getGist(gistId, { timestamp: Date.now() })
          .then(refineGist)
          .then(this.props.setScratchPaper);
      } else {
        this.props.setHome();
      }
      return Promise.resolve();
    };
    fetch()
      .then(() => {
        this.selectDefaultTab();
        return null; // to suppress unnecessary bluebird warning
      })
      .catch(error => {
        this.handleError(error);
        this.props.history.push('/');
      });
  }

  selectDefaultTab() {
    const { ext } = this.props.env;
    const { files } = this.props.current;
    const editingFile = files.find(file => extension(file.name) === 'json') ||
      files.find(file => extension(file.name) === ext) ||
      files.find(file => exts.includes(extension(file.name))) ||
      files[files.length - 1];
    this.props.setEditingFile(editingFile);
  }

  handleChangeWorkspaceWeights(workspaceWeights) {
    this.setState({ workspaceWeights });
    this.codeEditorRef.current.handleResize();
  }

  toggleNavigatorOpened(navigatorOpened = !this.state.workspaceVisibles[0]) {
    const workspaceVisibles = [...this.state.workspaceVisibles];
    workspaceVisibles[0] = navigatorOpened;
    this.setState({ workspaceVisibles });
  }

  handleClickTitleBar() {
    this.toggleNavigatorOpened();
  }

  render() {
    const { workspaceVisibles, workspaceWeights } = this.state;
    const { titles, description, saved } = this.props.current;
    const { locale } = this.props.env;

    const localizedTitles = titles.map(title => translateTitle(locale, title));
    const title = `${saved ? '' : translate(locale, 'app.unsavedPrefix')}${localizedTitles.join(' - ')}`;
    const localizedDescription = translateDescription(locale, description);
    const [navigatorOpened] = workspaceVisibles;

    return (
      <div className={styles.app}>
        <Helmet htmlAttributes={{ lang: locale }}>
          <title>{title}</title>
          <meta name="description" content={localizedDescription}/>
        </Helmet>
        <Header className={styles.header} onClickTitleBar={this.handleClickTitleBar}
                navigatorOpened={navigatorOpened} loadScratchPapers={this.loadScratchPapers}
                ignoreHistoryBlock={this.ignoreHistoryBlock}/>
        <ResizableContainer className={styles.workspace} horizontal weights={workspaceWeights}
                            visibles={workspaceVisibles} onChangeWeights={this.handleChangeWorkspaceWeights}>
          <Navigator/>
          <VisualizationViewer className={styles.visualization_viewer}/>
          <TabContainer className={styles.editor_tab_container}>
            <CodeEditor ref={this.codeEditorRef}/>
          </TabContainer>
        </ResizableContainer>
        <ToastContainer className={styles.toast_container}/>
      </div>
    );
  }
}

export default connect(({ current, env }) => ({ current, env }), actions)(
  App,
);

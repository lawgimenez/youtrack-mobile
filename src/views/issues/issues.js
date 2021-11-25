/* @flow */

import type {Node} from 'React';
import {
  View,
  Text,
  FlatList,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import React, {Component} from 'react';

import {bindActionCreators} from 'redux';
import {connect} from 'react-redux';

import * as issueActions from './issues-actions';
import ErrorMessage from '../../components/error-message/error-message';
import Issue from '../issue/issue';
import IssueRow from './issues__row';
import IssuesCount from './issues__count';
import IssuesSortBy from './issues__sortby';
import log from '../../components/log/log';
import QueryAssistPanel from '../../components/query-assist/query-assist-panel';
import QueryPreview from '../../components/query-assist/query-preview';
import Router from '../../components/router/router';
import Select from '../../components/select/select';
import SelectSectioned from '../../components/select/select-sectioned';
import usage from '../../components/usage/usage';
import {ANALYTICS_ISSUES_PAGE} from '../../components/analytics/analytics-ids';
import {ERROR_MESSAGE_DATA} from '../../components/error/error-message-data';
import {HIT_SLOP} from '../../components/common-styles/button';
import {IconAdd, IconAngleDown, IconBookmark} from '../../components/icon/icon';
import {IconNothingFound} from '../../components/icon/icon-no-found';
import {initialState} from './issues-reducers';
import {isReactElement} from '../../util/util';
import {logEvent} from '../../components/log/log-helper';
import {notifyError} from '../../components/notification/notification';
import {requestController} from '../../components/api/api__request-controller';
import {routeMap} from '../../app-routes';
import {SkeletonIssues} from '../../components/skeleton/skeleton';
import {ThemeContext} from '../../components/theme/theme-context';
import {UNIT} from '../../components/variables/variables';
import {View as AnimatedView} from 'react-native-animatable';

import styles, {noIssuesFoundIconSize} from './issues.styles';

import type Api from '../../components/api/api';
import type Auth from '../../components/auth/auth';
import type {AppState} from '../../reducers';
import type {ErrorMessageProps} from '../../components/error-message/error-message';
import type {IssueOnList} from '../../flow/Issue';
import type {IssuesState} from './issues-reducers';
import type {Theme} from '../../flow/Theme';

type IssuesActions = typeof issueActions;
type Props = {
  ...IssuesState,
  ...IssuesActions,
  auth: Auth,
  api: Api,
  isAppStart?: boolean,
  onOpenContextSelect: () => any
};


type State = {
  isEditQuery: boolean,
  clearSearchQuery: boolean,
  focusedIssue: IssueOnList | null,
}

export class Issues extends Component<Props, State> {
  searchPanelNode: Object;
  unsubscribeOnDispatch: Function;
  theme: Theme;

  constructor(props: Props) {
    super(props);
    this.state = {
      isEditQuery: false,
      clearSearchQuery: false,
      focusedIssue: null,
    };
    usage.trackScreenView('Issue list');
  }

  componentDidMount() {
    this.props.initializeIssuesList(this.props.isAppStart);

    this.unsubscribeOnDispatch = Router.setOnDispatchCallback((routeName: string, prevRouteName: string, options: Object) => {
      if (prevRouteName === routeMap.Issues && routeName !== routeMap.Issues) {
        requestController.cancelIssuesRequests();
      }

      if (routeName === routeMap.Issues && prevRouteName === routeMap.Issue && options?.issueId) {
        this.props.updateIssue(options.issueId);
        if (this.props.issuesCount === null) {
          this.props.refreshIssuesCount();
        }
      }
    });
  }

  componentWillUnmount() {
    this.unsubscribeOnDispatch();
  }

  shouldComponentUpdate(nextProps: Props, nextState: State): boolean {
    if (Object.keys(initialState).some((stateKey: string) => this.props[stateKey] !== nextProps[stateKey])) {
      return true;
    }

    return this.state !== nextState;
  }

  goToIssue(issue: IssueOnList) {
    log.debug(`Opening issue "${issue.id}" from list`);
    if (!issue.id) {
      log.warn('Attempt to open bad issue', issue);
      notifyError('Can\'t open issue', new Error('Attempt to open issue without ID'));
      return;
    }
    Router.Issue({
      issuePlaceholder: issue,
      issueId: issue.id,
    });
  }

  renderCreateIssueButton: ((isDisabled: boolean) => Node) = (isDisabled: boolean) => {
    return (
      <TouchableOpacity
        hitSlop={HIT_SLOP}
        testID="test:id/create-issue-button"
        accessibilityLabel="create-issue-button"
        accessible={true}
        style={styles.createIssueButton}
        onPress={() => Router.CreateIssue()}
        disabled={isDisabled}
      >
        <IconAdd size={20} color={this.theme.uiTheme.colors.$link}/>
      </TouchableOpacity>
    );
  };

  _renderRow = ({item}) => {
    const {focusedIssue} = this.state;

    if (isReactElement(item)) {
      return item;
    }

    return (
      <View
        style={[
          styles.row,
          focusedIssue?.id === item.id ? styles.tabletContainerIssueFocused : null,
        ]}
      >
        <IssueRow
          issue={item}
          onClick={(issue) => {
            if (this.props.isTablet) {
              this.updateFocusedIssue(issue);
            } else {
              this.goToIssue(issue);
            }
          }}
          onTagPress={(query) => Router.Issues({query})}/>
      </View>
    );
  };

  getKey: ((item: any) => string) = (item: Object) => {
    return `${isReactElement(item) ? item.key : item.id}`;
  };

  _renderRefreshControl() {
    return <RefreshControl
      refreshing={this.props.isRefreshing && !!this.props.isAppStart}
      //$FlowFixMe
      onRefresh={this.props.refreshIssues}
      tintColor={this.theme.uiTheme.colors.$link}
      testID="refresh-control"
      accessibilityLabel="refresh-control"
      accessible={true}
    />;
  }

  _renderSeparator = (item) => {
    if (isReactElement(item.leadingItem)) {
      return null;
    }
    return <View style={styles.separator}/>;
  };

  onEndReached: (() => void) = () => {
    this.props.loadMoreIssues();
  };

  renderContextButton = () => {
    const {onOpenContextSelect, isRefreshing, searchContext, isSearchContextPinned} = this.props;

    return (
      <TouchableOpacity
        key="issueListContext"
        accessible={true}
        testID = "test:id/issue-list-context"
        accessibilityLabel = "search-context"
        style={[
          styles.searchContext,
          isSearchContextPinned ? styles.searchContextPinned : null,
        ]}
        disabled={isRefreshing || !searchContext}
        onPress={onOpenContextSelect}
      >
        <View
          style={styles.searchContextButton}
        >
          <Text
            numberOfLines={1}
            style={styles.contextButtonText}
          >
            {`${searchContext?.name || ''} `}
          </Text>
          {searchContext && <IconAngleDown color={this.theme.uiTheme.colors.$text} size={17}/>}
        </View>
      </TouchableOpacity>
    );
  };


  renderContextSelect(): Node {
    const {selectProps} = this.props;

    if (selectProps.isOwnSearches) {
      return (
        <SelectSectioned
          getTitle={item => item.name + (item.shortName ? ` (${item.shortName})` : '')}
          {...selectProps}
        />
      );
    }

    return (
      <Select
        getTitle={item => item.name + (item.shortName ? ` (${item.shortName})` : '')}
        {...selectProps}
      />
    );
  }

  searchPanelRef: ((instance: ?QueryAssistPanel) => void) = (instance: ?QueryAssistPanel) => {
    if (instance) {
      this.searchPanelNode = instance;
    }
  };

  onScroll: ((nativeEvent: any) => void) = (nativeEvent: Object) => {
    const newY = nativeEvent.contentOffset.y;
    const isPinned: boolean = newY >= UNIT;
    if (this.props.isSearchContextPinned !== isPinned) {
      this.props.updateSearchContextPinned(isPinned);
    }
  };

  setEditQueryMode(isEditQuery: boolean) {
    this.setState({isEditQuery});
  }

  clearSearchQuery(clearSearchQuery: boolean) {
    this.setState({clearSearchQuery});
  }

  updateFocusedIssue(focusedIssue: IssueOnList | null) {
    this.setState({focusedIssue});
  }

  onSearchQueryPanelFocus: ((clearSearchQuery?: boolean) => void) = (clearSearchQuery: boolean = false) => {
    logEvent({
      message: 'Focus search panel',
      analyticsId: ANALYTICS_ISSUES_PAGE,
    });
    this.setEditQueryMode(true);
    this.clearSearchQuery(clearSearchQuery);
  };

  onQueryUpdate: (query: string) => void = (query: string) => {
    logEvent({
      message: 'Apply search',
      analyticsId: ANALYTICS_ISSUES_PAGE,
    });
    this.updateFocusedIssue(null);
    this.setEditQueryMode(false);
    this.props.setIssuesCount(null);
    this.props.onQueryUpdate(query);
  };

  renderSearchPanel: (() => Node) = () => {
    const {query, suggestIssuesQuery, queryAssistSuggestions} = this.props;
    const _query = this.state.clearSearchQuery ? '' : query;

    return (
      <QueryAssistPanel
        key="QueryAssistPanel"
        ref={this.searchPanelRef}
        queryAssistSuggestions={queryAssistSuggestions}
        query={_query}
        suggestIssuesQuery={suggestIssuesQuery}
        onQueryUpdate={(q: string) => {
          this.onQueryUpdate(q);
        }}
        onClose={(q: string) => {
          if (this.state.clearSearchQuery) {
            logEvent({
              message: 'Clear search',
              analyticsId: ANALYTICS_ISSUES_PAGE,
            });
            this.onQueryUpdate(q);
          } else {
            this.setEditQueryMode(false);
          }
        }}
        clearButtonMode="always"
      />
    );
  };

  hasIssues = (): boolean => this.props.issues?.length > 0;

  renderSearchQuery = () => {
    const {query, issuesCount, openSavedSearchesSelect, searchContext, isAppStart} = this.props;
    const Component: any = isAppStart ? AnimatedView : View;
    return (
      <Component
        {...(isAppStart ? {
          useNativeDriver: true,
          duration: isAppStart ? 500 : 0,
          animation: 'fadeIn',
        } : {})}
        style={styles.listHeader}
      >
        <View style={styles.listHeaderTop}>
          <QueryPreview
            style={styles.searchPanel}
            query={query}
            onFocus={this.onSearchQueryPanelFocus}
          />
          <TouchableOpacity
            style={styles.userSearchQueryButton}
            testID="test:id/user-search-query-button"
            accessibilityLabel="user-search-query-button"
            accessible={true}
            onPress={openSavedSearchesSelect}
          >
            <IconBookmark size={28} color={this.theme.uiTheme.colors.$link}/>
          </TouchableOpacity>

        </View>

        {this.hasIssues() && <View style={styles.toolbar}>
          {!isAppStart && <IssuesCount issuesCount={issuesCount}/>}
          {!isAppStart && <IssuesSortBy
            context={searchContext}
            onApply={(q: string) => {this.onQueryUpdate(q);}}
            query={query}
          />}
        </View>}
      </Component>
    );
  };

  renderIssuesFooter: (() => null | Node) = () => {
    const {isLoadingMore} = this.props;
    if (isLoadingMore) {
      return <SkeletonIssues/>;
    }
    return null;
  };

  renderIssueList(): Node {
    const {issues, isRefreshing} = this.props;
    const contextButton = this.renderContextButton();
    const searchQuery = this.renderSearchQuery();

    if (isRefreshing && (!issues || issues.length === 0)) {
      return (
        <View style={styles.list}>
          {contextButton}
          {searchQuery}

          <SkeletonIssues/>
        </View>
      );
    }

    const listData: Array<Object> = [
      contextButton,
      searchQuery,
    ].concat(issues || []);

    return (
      <FlatList
        style={styles.list}
        testID="issue-list"
        stickyHeaderIndices={[0]}
        removeClippedSubviews={false}

        data={listData}
        keyExtractor={this.getKey}
        renderItem={this._renderRow}
        ItemSeparatorComponent={this._renderSeparator}
        ListEmptyComponent={() => {
          return <Text>No issues found</Text>;
        }}
        ListFooterComponent={this.renderIssuesFooter}

        refreshControl={this._renderRefreshControl()}
        onScroll={(params) => this.onScroll(params.nativeEvent)}
        tintColor={this.theme.uiTheme.colors.$link}

        onEndReached={this.onEndReached}
        onEndReachedThreshold={0.1}
      />
    );
  }

  renderError(): null | Node {
    const {isRefreshing, loadingError, isInitialized} = this.props;
    if (isRefreshing || !isInitialized) {
      return null;
    }

    const props: $Shape<ErrorMessageProps> = Object.assign(
      {},
      loadingError
        ? {error: loadingError}
        : (!this.hasIssues() ? {
          errorMessageData: {
            ...ERROR_MESSAGE_DATA.NO_ISSUES_FOUND,
            icon: () => <IconNothingFound size={noIssuesFoundIconSize} style={styles.noIssuesFoundIcon}/>,
          },
        } : null)
    );

    if (Object.keys(props).length > 0) {
      return <ErrorMessage testID="issuesLoadingError" {...props}/>;
    }

    return null;
  }

  renderIssues = () => {
    const {isIssuesContextOpen, isRefreshing} = this.props;
    return (
      <View
        style={styles.listContainer}
        testID="test:id/issueListPhone"
      >
        {isIssuesContextOpen && this.renderContextSelect()}
        {this.state.isEditQuery && this.renderSearchPanel()}

        {this.renderIssueList()}
        {this.renderError()}

        {this.renderCreateIssueButton(isRefreshing)}
      </View>
    );
  };

  renderFocusedIssue = () => {
    const {focusedIssue} = this.state;

    if (!focusedIssue || !this.hasIssues()) {
      return (
        <View style={styles.tabletContainerIssueEmpty}>
          <Text style={styles.mainText}>Select issue</Text>
        </View>
      );
    }

    return (
      <View style={styles.tabletContainerIssue}>
        <Issue
          issuePlaceholder={focusedIssue}
          issueId={focusedIssue.id}
        />
      </View>
    );
  };

  renderSplitView = () => {
    return (
      <>
        <View style={styles.tabletContainerList}>
          {this.renderIssues()}
        </View>
        <View style={styles.tabletContainerIssue}>
          {this.renderFocusedIssue()}
        </View>
      </>
    );
  };

  render(): Node {
    const {isTablet} = this.props;
    return (
      <ThemeContext.Consumer>
        {(theme: Theme) => {
          this.theme = theme;
          return (
            <View
              style={[styles.listContainer, isTablet ? styles.tabletContainer : null]}
              testID="issue-list-page"
            >
              {isTablet && this.renderSplitView()}
              {!isTablet && this.renderIssues()}
            </View>
          );
        }}
      </ThemeContext.Consumer>
    );
  }
}

const mapStateToProps = (state: AppState, ownProps: { isAppStart?: boolean }) => {
  return {
    ...ownProps,
    ...state.issueList,
    ...state.app,
    searchContext: state.app?.user?.profiles?.general?.searchContext,
    isTablet: state.app.isTablet,
  };
};

const mapDispatchToProps = (dispatch) => {
  return {
    ...bindActionCreators(issueActions, dispatch),
    onQueryUpdate: (query) => dispatch(issueActions.onQueryUpdate(query)),
    onOpenContextSelect: () => dispatch(issueActions.openContextSelect()),
    openSavedSearchesSelect: () => dispatch(issueActions.openSavedSearchesSelect()),
    updateSearchContextPinned: (isSearchScrolledUp) => dispatch(
      issueActions.updateSearchContextPinned(isSearchScrolledUp)),
    setIssuesCount: (count: number | null) => dispatch(issueActions.setIssuesCount(count)),
    updateIssue: (issueId: string) => dispatch(issueActions.updateIssue(issueId)),
  };
};

export default (connect(mapStateToProps, mapDispatchToProps)(Issues): any);

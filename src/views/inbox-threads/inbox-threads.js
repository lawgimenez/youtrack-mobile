/* @flow */

import React, {useCallback, useContext, useEffect, useRef, useState} from 'react';
import {Dimensions, Linking, TouchableOpacity, View} from 'react-native';

import {SceneMap, TabBar, TabView} from 'react-native-tab-view';
import {useActionSheet} from '@expo/react-native-action-sheet';
import {useDispatch} from 'react-redux';

import * as actions from './inbox-threads-actions';
import Article from 'views/article/article';
import Header from 'components/header/header';
import InboxThreadsTab from './inbox-threads__tab';
import InboxThreadsTabBar from './inbox-threads__tab-bar';
import Issue from '../issue/issue';
import NothingSelectedIconWithText from 'components/icon/nothing-selected-icon-with-text';
import {defaultActionsOptions} from 'components/action-sheet/action-sheet';
import {folderIdMap, threadTabsTitles} from './inbox-threads-helper';
import {getStorageState} from 'components/storage/storage';
import {hasType} from 'components/api/api__resource-types';
import {i18n} from 'components/i18n/i18n';
import {IconMoreOptions} from 'components/icon/icon';
import {isSplitView as hasSplitView} from 'components/responsive/responsive-helper';
import {markAllAsRead} from './inbox-threads-actions';
import {ThemeContext} from 'components/theme/theme-context';

import styles from './inbox-threads.styles';
import tabStyles from 'components/issue-tabbed/issue-tabbed.style';

import type {Node} from 'react';
import type {TabRoute} from 'flow/Issue';
import type {Theme, UIThemeColors} from 'flow/Theme';

const routes: TabRoute[] = threadTabsTitles.map((name: string, index: number) => ({
  key: index,
  title: name,
  id: folderIdMap[index],
}));

const InboxThreads: () => Node = (): Node => {
  const dispatch = useDispatch();
  const {showActionSheetWithOptions} = useActionSheet();

  const theme: Theme = useContext(ThemeContext);

  const [selectedEntity, updateSelectedEntity] = useState({entity: null, navigateToActivity: false});

  const [isSplitView, updateIsSplitView] = useState(hasSplitView());
  const dimensionsChangeListener = useRef();

  const loadThreads = useCallback(
    (folderId?: string, end?: number | null) => {
      dispatch(actions.loadInboxThreads(folderId, end));
    },
    [dispatch]
  );

  const [navigationState, updateNavigationState] = useState({
    index: 0,
    routes,
  });

  useEffect(() => {
    const index: number = actions.lastVisitedTabIndex();
    if (index > 0) {
      updateNavigationState({index, routes});
    }
    loadThreads(folderIdMap[index]);
    dimensionsChangeListener.current = Dimensions.addEventListener('change', () => {
      updateIsSplitView(hasSplitView());
    });
    return () => dimensionsChangeListener.current?.remove();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const renderTabBar = (props: any) => {
    const uiThemeColors: UIThemeColors = theme.uiTheme.colors;
    return (
      <TabBar
        {...props}
        pressColor={uiThemeColors.$disabled}
        indicatorStyle={{backgroundColor: uiThemeColors.$link}}
        style={[tabStyles.tabsBar, {shadowColor: uiThemeColors.$separator}]}
        tabStyle={tabStyles.tabsBarFluid}
        renderLabel={({route, focused}: { route: TabRoute, focused: boolean }) => (
          <InboxThreadsTabBar route={route} focused={focused} index={navigationState.index}/>
        )}
        scrollEnabled={true}
      />
    );
  };

  const renderEntity = () => {
    if (!selectedEntity?.entity) {
      return <NothingSelectedIconWithText text={i18n('Select an issue, article or change from the list')}/>;
    }

    return (
      hasType.article(selectedEntity.entity)
        ? <Article articlePlaceholder={selectedEntity.entity} navigateToActivity={selectedEntity.navigateToActivity}/>
        : (
          <Issue
            issuePlaceholder={selectedEntity.entity}
            issueId={selectedEntity.entity.id}
            navigateToActivity={selectedEntity.navigateToActivity}
          />
        )
    );
  };

  const renderTabs = () => {
    return (
      <TabView
        lazy={true}
        swipeEnabled={true}
        navigationState={navigationState}
        renderScene={SceneMap(
          routes.reduce((map, it: TabRoute, index: number) => {
            return ({
              ...map,
              [index]: () => (
                <InboxThreadsTab
                  folderId={folderIdMap[index]}
                  onLoadMore={(folderId?: string, end?: null) => loadThreads(folderId, end)}
                  onSelect={(entity, navigateToActivity) => {
                    if (isSplitView) {
                      updateSelectedEntity({entity, navigateToActivity});
                    }
                  }}
                />
              ),
            });
          }, {})
        )}
        initialLayout={{
          height: 0,
          width: Dimensions.get('window').width,
        }}
        renderTabBar={renderTabBar}
        onIndexChange={(index: number) => {
          loadThreads(folderIdMap[index]);
          updateNavigationState({index, routes});
          actions.lastVisitedTabIndex(index);
        }}
      />
    );
  };

  const renderHeader = () => (
    <Header
      title={i18n('Notifications')}
      rightButton={<TouchableOpacity
        testID="test:id/inboxSettings"
        accessibilityLabel="inboxSettings"
        accessible={true}
        onPress={() => {
          const options = [
            {
              title: actions.isUnreadOnly() ? i18n('Show all') : i18n('Unread only'),
              execute: () => {
                actions.toggleUnreadOnly();
                loadThreads(folderIdMap[navigationState.index], null);
              },
            },
            {
              title: i18n('Mark all as read'),
              execute: () => dispatch(markAllAsRead()),
            },
            {
              title: i18n('Notification settings…'),
              execute: () => Linking.openURL(
                `${getStorageState().config.backendUrl}/users/me?tab=notifications`
              ),
            },
            {
              title: i18n('Cancel'),
            },
          ];

          showActionSheetWithOptions(
            {
              ...defaultActionsOptions,
              options: options.map(action => action.title),
              cancelButtonIndex: options.length - 1,
            },
            (index: number) => options[index]?.execute && options[index].execute()
          );
        }}
        style={styles.threadTitleAction}
      >
        <IconMoreOptions
          size={18}
          color={styles.link.color}
        />
      </TouchableOpacity>}
    />
  );

  return (
    <View
      testID="test:id/inboxThreads"
      accessibilityLabel="inboxThreads"
      accessible={true}
      style={[
        styles.container,
        isSplitView ? styles.splitViewContainer : null,
      ]}>

      {!isSplitView && <>
        {renderHeader()}
        {renderTabs()}
      </>}
      {isSplitView && <>
        <View style={styles.splitViewSide}>
          {renderHeader()}
          {renderTabs()}
        </View>
        <View style={styles.splitViewMain}>
          {renderEntity()}
        </View>
      </>}
    </View>
  );
};


export default InboxThreads;

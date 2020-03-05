/* @flow */

import {View, Text, RefreshControl, TouchableOpacity, ActivityIndicator, Dimensions} from 'react-native';
import React, {Component} from 'react';
import usage from '../../components/usage/usage';
import Header from '../../components/header/header';
import Select from '../../components/select/select';
import styles from './agile-board.styles';
import Menu from '../../components/menu/menu';
import log from '../../components/log/log';
import BoardHeader from './board-header';
import BoardRow from '../../components/agile-row/agile-row';
import AgileCard from '../../components/agile-card/agile-card';
import BoardScroller, {COLUMN_SCREEN_PART} from '../../components/board-scroller/board-scroller';
import Router from '../../components/router/router';
import Auth from '../../components/auth/auth';
import {Draggable, DragContainer} from '../../components/draggable/';
import Api from '../../components/api/api';
import {
  COLOR_PINK,
  AGILE_COLLAPSED_COLUMN_WIDTH,
  COLOR_BLACK,
  COLOR_FONT_GRAY
} from '../../components/variables/variables';
import {getStorageState, flushStoragePart} from '../../components/storage/storage';
import type {SprintFull, Board, AgileBoardRow, AgileColumn} from '../../flow/Agile';
import type {IssueOnList} from '../../flow/Issue';
import type {AgilePageState} from './board-reducers';

import * as boardActions from './board-actions';
import {openMenu} from '../../actions/app-actions';
import {connect} from 'react-redux';
import type IssuePermissions from '../../components/issue-permissions/issue-permissions';
import ModalView from '../../components/modal-view/modal-view';
import ErrorMessageInline from '../../components/error-message/error-message-inline';
import {HIT_SLOP} from '../../components/common-styles/button';
import {IconAngleDown, IconMagnifyZoom, IconMenu} from '../../components/icon/icon';

const CATEGORY_NAME = 'Agile board';

type Props = AgilePageState & {
  auth: Auth,
  api: Api,
  isLoading: boolean,
  isLoadingMore: boolean,
  noMoreSwimlanes: boolean,
  sprint: ?SprintFull,
  isSprintSelectOpen: boolean,
  selectProps: Object,
  issuePermissions: IssuePermissions,
  onLoadBoard: () => any,
  onLoadMoreSwimlanes: () => any,
  onRowCollapseToggle: (row: AgileBoardRow) => any,
  onColumnCollapseToggle: (column: AgileColumn) => any,
  onOpenSprintSelect: (any) => any,
  onOpenBoardSelect: (any) => any,
  onCloseSelect: (any) => any,
  createCardForCell: (columnId: string, cellId: string) => any,
  onOpenMenu: (any) => any,
  onCardDrop: (any) => any,
  refreshAgile: (agileId: string, sprintId: string) => any,
  toggleRefreshPopup: (isOutOfDate: boolean) => any
};

type State = {
  zoomedIn: boolean
};

class AgileBoard extends Component<Props, State> {
  boardHeader: ?BoardHeader;

  constructor(props: Props) {
    super(props);
    this.state = {
      zoomedIn: getStorageState().agileZoomedIn ?? true
    };
  }

  componentDidMount() {
    usage.trackScreenView(CATEGORY_NAME);
    this.props.onLoadBoard();
  }

  onVerticalScroll = (event) => {
    const {nativeEvent} = event;
    const viewHeight = nativeEvent.layoutMeasurement.height;
    const scroll = nativeEvent.contentOffset.y;
    const contentHeight = nativeEvent.contentSize.height;
    const maxScroll = contentHeight - viewHeight;

    if (maxScroll > 0 && scroll > 0 && (maxScroll - scroll) < 40) {
      this.props.onLoadMoreSwimlanes();
    }
  };

  onContentSizeChange = (width, height) => {
    const windowHeight = Dimensions.get('window').height;
    if (height < windowHeight) {
      this.props.onLoadMoreSwimlanes();
    }
  };

  syncHeaderPosition = (event) => {
    const {nativeEvent} = event;
    if (this.boardHeader) {
      this.boardHeader.setNativeProps({
        style: {left: -nativeEvent.contentOffset.x}
      });
    }
  };

  _renderRefreshControl() {
    return <RefreshControl
      refreshing={this.props.isLoading}
      tintColor={COLOR_PINK}
      onRefresh={() => this.props.onLoadBoard()}
    />;
  }

  _onTapIssue = (issue: IssueOnList) => {
    log.debug(`Opening issue "${issue.id}" from Agile Board`);
    usage.trackEvent(CATEGORY_NAME, 'Open issue');
    Router.SingleIssue({
      issuePlaceholder: issue,
      issueId: issue.id
    });
  };

  _getScrollableWidth = (): number | null => {
    const {sprint} = this.props;

    if (!sprint || !sprint.board || !sprint.board.columns) {
      return null;
    }

    const COLUMN_WIDTH = Dimensions.get('window').width * COLUMN_SCREEN_PART;
    return sprint.board.columns
      .map(col => col.collapsed ? AGILE_COLLAPSED_COLUMN_WIDTH : COLUMN_WIDTH)
      .reduce((res, item) => res + item, 0);
  };

  renderNavigation() {
    const {agile, sprint, onOpenSprintSelect, onOpenBoardSelect, isLoading} = this.props;
    if (!agile) {
      return null;
    }
    const navigation = [{
      label: agile.name,
      id: 'sprintAgileName',
      onPress: onOpenBoardSelect,
      textStyle: styles.agileNavigationButtonTextMain
    }];

    if (sprint) {
      navigation.push({
        label: sprint.name,
        id: 'sprintName',
        onPress: onOpenSprintSelect,
        textStyle: styles.null
      });
    }

    return (
      <View style={styles.agileNavigation}>
        {navigation.map(it => {
          return (
            <TouchableOpacity
              key={it.id}
              style={styles.agileNavigationButton}
              disabled={isLoading}
              onPress={it.onPress}
            >
              <Text
                style={[
                  styles.agileNavigationButtonText,
                  it.textStyle,
                  isLoading ? styles.agileNavigationButtonTextDisabled : null
                ]}
                numberOfLines={1}
              >
                {`${it.label} `}
              </Text>
              <IconAngleDown size={15} color={isLoading ? COLOR_FONT_GRAY : COLOR_BLACK} style={styles.agileNavigationButtonIcon}/>
            </TouchableOpacity>
          );
        })}
      </View>
    );
  }

  _renderHeader(isSprintLoaded: boolean) {
    const {zoomedIn} = this.state;

    return (
      <Header
        leftButton={<IconMenu/>}
        rightButton={
          <Text
            onPress={this.toggleZoom}>
            {isSprintLoaded && <IconMagnifyZoom zoomedIn={zoomedIn} size={24}/>}
          </Text>
        }
        onBack={this.props.onOpenMenu}
      >
      </Header>
    );
  }

  boardHeaderRef = (instance: ?BoardHeader) => {
    if (instance) {
      this.boardHeader = instance;
    }
  };

  _renderBoardHeader(sprint: SprintFull) {
    const {zoomedIn} = this.state;
    return (
      <View style={styles.boardHeaderContainer}>
        <BoardHeader
          ref={this.boardHeaderRef}
          style={{minWidth: zoomedIn ? this._getScrollableWidth() : null}}
          columns={sprint?.board?.columns}
          onCollapseToggle={this.props.onColumnCollapseToggle}
        />
      </View>
    );
  }

  _renderSelect() {
    const {selectProps} = this.props;
    return (
      <ModalView
        visible
        animationType="fade"
        onRequestClose={() => true}
      >
        <Select
          getTitle={item => item.name}
          onCancel={this.props.onCloseSelect}
          {...selectProps}
        />
      </ModalView>
    );
  }

  renderRefreshPopup() {
    const {sprint, refreshAgile, toggleRefreshPopup} = this.props;

    if (!sprint || !sprint.agile) {
      return null;
    }

    return (
      <ModalView
        transparent={true}
        style={styles.popupModal}
        visible
        animationType="slide"
        onRequestClose={() => true}
      >
        <View style={styles.popupPanel}>
          <Text style={styles.popupText}>
            The current sprint is out of date. Reload it to avoid data inconsistency.
          </Text>

          <View style={styles.popupButtons}>
            <TouchableOpacity
              hitSlop={HIT_SLOP}
              onPress={() => toggleRefreshPopup(false)}>
              <Text style={styles.popupButtonText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              hitSlop={HIT_SLOP}
              onPress={() => refreshAgile(sprint.agile.id, sprint.id)}>
              <Text style={styles.popupButtonText}>Refresh</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ModalView>
    );
  }

  renderErrors() {
    const {agile} = this.props;
    const errors = agile?.status?.errors || [];

    if (errors.length > 0) {
      return (
        <View>
          {errors.map(
            (error, index) => <ErrorMessageInline key={`agileError-${index}`} error={error}/>)
          }
        </View>
      );
    }
  }

  _renderBoard(sprint: SprintFull) {
    const board: Board = sprint?.board;

    if (!sprint || !board) {
      return null;
    }

    const commonRowProps = {
      collapsedColumnIds: (board.columns || []).filter(col => col.collapsed).map(col => col.id),
      onTapIssue: this._onTapIssue,
      onTapCreateIssue: this.props.createCardForCell,
      onCollapseToggle: this.props.onRowCollapseToggle,
      renderIssueCard: (issue: IssueOnList) => {
        const canDrag = sprint.agile.isUpdatable || this.props.issuePermissions.canRunCommand(issue);
        return (
          <Draggable key={issue.id} data={issue.id} onPress={() => this._onTapIssue(issue)} disabled={!canDrag}>
            <AgileCard issue={issue} style={styles.card} estimationField={sprint.agile.estimationField}/>
          </Draggable>
        );
      }
    };

    const orphan = <BoardRow key="orphan" row={board.orphanRow} {...commonRowProps}/>;

    return [
      sprint.agile.orphansAtTheTop && orphan,

      board.trimmedSwimlanes.map((swimlane: Object & { id: string }) => {
        return (
          <BoardRow
            key={swimlane.id}
            row={swimlane}
            {...commonRowProps}
          />
        );
      }),

      !sprint.agile.orphansAtTheTop && orphan,
    ];
  }

  onDragStart() {
    usage.trackEvent(CATEGORY_NAME, 'Card drag start');
  }

  onDragEnd = (draggingComponent: Object, hitZones: Array<Object>) => {
    const movedId = draggingComponent.data;
    const dropZone = hitZones[0];
    if (!dropZone) {
      return;
    }

    this.props.onCardDrop({
      columnId: dropZone.data.columnId,
      cellId: dropZone.data.cellId,
      leadingId: dropZone.data.issueIds
        .filter(id => id !== movedId)[dropZone.placeholderIndex - 1],
      movedId
    });
  };

  toggleZoom = () => {
    const zoomedIn = !this.state.zoomedIn;
    this.setState({zoomedIn});
    flushStoragePart({agileZoomedIn: zoomedIn});
  };

  renderBoard() {
    const {sprint, isLoadingMore} = this.props;
    const {zoomedIn} = this.state;

    return (
      <DragContainer onDragStart={this.onDragStart} onDragEnd={this.onDragEnd}>
        <BoardScroller
          columns={sprint?.board?.columns}
          snap={zoomedIn}
          refreshControl={this._renderRefreshControl()}
          horizontalScrollProps={{
            contentContainerStyle: {
              display: 'flex',
              flexDirection: 'column',
              width: zoomedIn ? this._getScrollableWidth() : '100%'
            },
            onScroll: this.syncHeaderPosition
          }}
          verticalScrollProps={{
            onScroll: this.onVerticalScroll,
            onContentSizeChange: this.onContentSizeChange,
            contentContainerStyle: {
              minHeight: '100%'
            }
          }}
        >

          {this._renderBoard(sprint)}
          {isLoadingMore && <ActivityIndicator color={COLOR_PINK} style={styles.loadingMoreIndicator}/>}

        </BoardScroller>
      </DragContainer>
    );
  }

  render() {
    const {sprint, isSprintSelectOpen, isOutOfDate, agile, isLoading} = this.props;
    const isValidBoard: boolean = agile?.status?.valid === true;
    const hasSprint = !!sprint;
    const isSprintLoaded: boolean = hasSprint && isValidBoard;
    const isFirstLoading = Boolean(isLoading && !hasSprint);

    return (
      <Menu>
        <View
          testID='pageAgile'
          style={styles.container}
        >
          {this._renderHeader(isSprintLoaded)}

          {this.renderNavigation()}

          {isSprintLoaded && !isLoading && this._renderBoardHeader(sprint)}

          {((isFirstLoading && isValidBoard) || isLoading) && (
            <View style={styles.loadingIndicator}>
              <ActivityIndicator color={COLOR_PINK}/>
            </View>
          )}

          {this.renderErrors()}

          {isSprintLoaded && !isLoading && this.renderBoard()}

          {isSprintSelectOpen && this._renderSelect()}

          {isOutOfDate && this.renderRefreshPopup()}
        </View>
      </Menu>
    );
  }
}


const mapStateToProps = (state, ownProps) => {
  return {
    ...state.agile,
    ...state.app
  };
};

const mapDispatchToProps = (dispatch) => {
  return {
    onLoadBoard: () => dispatch(boardActions.loadDefaultAgileBoard()),
    onLoadMoreSwimlanes: () => dispatch(boardActions.fetchMoreSwimlanes()),
    onRowCollapseToggle: (row) => dispatch(boardActions.rowCollapseToggle(row)),
    onColumnCollapseToggle: (column) => dispatch(boardActions.columnCollapseToggle(column)),
    onOpenSprintSelect: () => dispatch(boardActions.openSprintSelect()),
    onOpenBoardSelect: () => dispatch(boardActions.openBoardSelect()),
    onCloseSelect: () => dispatch(boardActions.closeSelect()),
    onOpenMenu: () => dispatch(openMenu()),
    createCardForCell: (...args) => dispatch(boardActions.createCardForCell(...args)),
    onCardDrop: (...args) => dispatch(boardActions.onCardDrop(...args)),
    refreshAgile: (agileId: string, sprintId: string) => dispatch(boardActions.refreshAgile(agileId, sprintId)),
    toggleRefreshPopup: (isOutOfDate: boolean) => dispatch(boardActions.setOutOfDate(isOutOfDate))
  };
};

export default connect(mapStateToProps, mapDispatchToProps)(AgileBoard);

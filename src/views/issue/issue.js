/* @flow */

import React from 'react';
import {RefreshControl, Text, View} from 'react-native';

import {bindActionCreators} from 'redux';
import {connect} from 'react-redux';

import * as issueActions from './issue-actions';
import AttachFileDialog from '../../components/attach-file/attach-file-dialog';
import ColorField from '../../components/color-field/color-field';
import CommandDialog from '../../components/command-dialog/command-dialog';
import ErrorMessage from '../../components/error-message/error-message';
import Header from '../../components/header/header';
import IssueActivity from './activity/issue__activity';
import IssueDetails from './issue__details';
import IssueDetailsModal from './issue.modal__details';
import IssueTabbed from '../../components/issue-tabbed/issue-tabbed';
import LinkedIssuesAddLink from '../../components/linked-issues/linked-issues-add-link';
import Router from '../../components/router/router';
import Select from '../../components/select/select';
import Star from '../../components/star/star';
import usage from '../../components/usage/usage';
import {attachmentActions} from './issue__attachment-actions-and-types';
import {getApi} from '../../components/api/api__instance';
import {getReadableID} from '../../components/issue-formatter/issue-formatter';
import {IconBack, IconCheck, IconClose, IconDrag, IconMoreOptions} from '../../components/icon/icon';
import {isIOSPlatform} from '../../util/util';
import {isSplitView} from '../../components/responsive/responsive-helper';
import {IssueContext} from './issue-context';
import {Skeleton} from '../../components/skeleton/skeleton';
import {ThemeContext} from '../../components/theme/theme-context';

import styles from './issue.styles';

import type IssuePermissions from '../../components/issue-permissions/issue-permissions';
import type {AnyIssue, IssueFull} from '../../flow/Issue';
import type {Attachment, IssueLink, Tag} from '../../flow/CustomFields';
import type {AttachmentActions} from '../../components/attachments-row/attachment-actions';
import type {IssueTabbedState} from '../../components/issue-tabbed/issue-tabbed';
import type {NormalizedAttachment} from '../../flow/Attachment';
import type {RootState} from '../../reducers/app-reducer';
import type {State as IssueState} from './issue-reducers';
import type {Theme, UITheme} from '../../flow/Theme';
import type {User} from '../../flow/User';


const isIOS: boolean = isIOSPlatform();

type AdditionalProps = {
  issuePermissions: IssuePermissions,
  issuePlaceholder: Object,

  uploadIssueAttach: (files: Array<NormalizedAttachment>) => any,
  loadAttachments: () => any,
  hideAddAttachDialog: () => any,
  createAttachActions: () => any,
  removeAttachment: (attach: Attachment) => any,
  isTagsSelectVisible: boolean,
  navigateToActivity: boolean,
};

export type IssueProps = {
  ...IssueState,
  ...(typeof issueActions),
  ...AttachmentActions,
  ...AdditionalProps
};

//$FlowFixMe
export class Issue extends IssueTabbed<IssueProps, IssueTabbedState> {
  static contextTypes = {
    actionSheet: Function,
  };

  CATEGORY_NAME = 'Issue';
  imageHeaders = getApi().auth.getAuthorizationHeaders();
  backendUrl = getApi().config.backendUrl;
  renderRefreshControl = this._renderRefreshControl.bind(this);

  async init() {
    usage.trackScreenView(this.CATEGORY_NAME);
    await this.props.unloadIssueIfExist();
    await this.props.setIssueId(this.props.issueId || this.props?.issuePlaceholder?.id);
    await this.loadIssue();

    if (this.props.navigateToActivity) {
      this.switchToActivityTab();
    }
  }

  async componentDidMount() {
    await this.init();
  }

  async UNSAFE_componentWillReceiveProps(nextProps: IssueProps): Promise<void> {
    if (nextProps.issueId !== this.props.issueId) {
      await this.init();
    }
  }

  componentDidUpdate(prevProps: IssueProps): void {
    if (this.props.editMode === true && !prevProps.editMode && this.isActivityTabEnabled()) {
      this.switchToDetailsTab();
    }
  }

  async loadIssue() {
    await this.props.loadIssue();
  }

  renderDetails = (uiTheme: UITheme) => {
    const {
      loadIssue,
      openNestedIssueView,
      attachingImage,
      refreshIssue,
      issuePermissions,
      updateIssueFieldValue,
      updateProject,

      isSavingEditedIssue,
      summaryCopy,
      descriptionCopy,
      openIssueListWithSearch,
      setIssueSummaryCopy,
      setIssueDescriptionCopy,

      issue, issuePlaceholder, issueLoaded, editMode,
      toggleVote,

      removeAttachment,
      updateIssueVisibility,

      toggleVisibleAddAttachDialog,
      onTagRemove,

      onCheckboxUpdate,
      onShowCopyTextContextActions,
      getIssueLinksTitle,

      setCustomFieldValue,
    } = this.props;

    const splitViewEnabled: boolean = isSplitView();
    const Component: any = splitViewEnabled ? IssueDetailsModal : IssueDetails;
    return (
      <Component
        loadIssue={loadIssue}
        openNestedIssueView={openNestedIssueView}
        attachingImage={attachingImage}
        refreshIssue={refreshIssue}

        issuePermissions={issuePermissions}
        updateIssueFieldValue={updateIssueFieldValue}
        updateProject={updateProject}

        issue={issue}
        issuePlaceholder={issuePlaceholder}
        issueLoaded={issueLoaded}
        editMode={editMode}

        openIssueListWithSearch={openIssueListWithSearch}
        isSavingEditedIssue={isSavingEditedIssue}

        summaryCopy={summaryCopy}
        descriptionCopy={descriptionCopy}
        setIssueSummaryCopy={setIssueSummaryCopy}
        setIssueDescriptionCopy={setIssueDescriptionCopy}

        analyticCategory={this.CATEGORY_NAME}
        renderRefreshControl={() => this.renderRefreshControl(() => this.loadIssue(), uiTheme)}

        onVoteToggle={toggleVote}
        onSwitchToActivity={this.switchToActivityTab}

        onRemoveAttachment={removeAttachment}

        onVisibilityChange={updateIssueVisibility}

        onAttach={toggleVisibleAddAttachDialog}
        onTagRemove={onTagRemove}

        onCheckboxUpdate={(checked: boolean, position: number, description: string) => onCheckboxUpdate(checked, position, description)}
        onLongPress={(text: string, title?: string) => {
          onShowCopyTextContextActions(this.context.actionSheet(), text, title);
        }}
        getIssueLinksTitle={getIssueLinksTitle}
        issuesGetter={this.props.loadIssuesXShort}
        linksGetter={this.props.loadLinkedIssues}
        onUnlink={this.props.onUnlinkIssue}
        onLinkIssue={this.props.onLinkIssue}

        setCustomFieldValue={setCustomFieldValue}
        linksHasOverlay={splitViewEnabled}
      />
    );
  };

  renderActivity = (uiTheme: UITheme): React$Element<typeof IssueActivity> => {
    const {
      issue,
      user,
      issuePermissions,
      selectProps,
      updateUserAppearanceProfile,
      openNestedIssueView,
      issuePlaceholder,
    } = this.props;

    return (
      <IssueActivity
        issue={issue}
        issuePlaceholder={issuePlaceholder}
        user={user}
        openNestedIssueView={openNestedIssueView}
        issuePermissions={issuePermissions}
        selectProps={selectProps}
        updateUserAppearanceProfile={updateUserAppearanceProfile}
        renderRefreshControl={(loadActivities: () => any) => this.renderRefreshControl(loadActivities, uiTheme)}
      />
    );
  };

  isTabChangeEnabled() {
    const {editMode, isSavingEditedIssue, isRefreshing, attachingImage} = this.props;
    return !editMode && !isSavingEditedIssue && !isRefreshing && !attachingImage;
  }

  handleOnBack() {
    const hasParentRoute: boolean = Router.pop();
    if (!hasParentRoute) {
      Router.Issues();
    }
  }

  renderBackIcon = () => {
    return isSplitView() ? null : <IconBack color={this.uiTheme.colors.$link}/>;
  }

  canStar = (): boolean => {
    const {issue, issuePermissions} = this.props;
    return issue && issuePermissions && issuePermissions.canStar();
  };

  renderActionsIcon(uiTheme: UITheme) {
    if (!this.isIssueLoaded()) {
      return <Skeleton width={24}/>;
    }
    return (
      <Text style={styles.iconMore}>
        {isIOS
          ? <IconMoreOptions size={18} color={uiTheme.colors.$link}/>
          : <Text><IconDrag size={18} color={uiTheme.colors.$link}/></Text>
        }
        <Text>{' '}</Text>
      </Text>
    );
  }

  renderStar = (uiTheme: UITheme) => {
    const {issue, toggleStar} = this.props;
    if (this.isIssueLoaded()) {
      return (
        <Star
          style={styles.issueStar}
          canStar={this.canStar()}
          hasStar={issue.watchers.hasStar}
          onStarToggle={toggleStar}
          uiTheme={uiTheme}
        />
      );
    }

    return <Skeleton width={24}/>;
  };


  renderHeaderIssueTitle() {
    const {issue, issuePlaceholder, issueLoadingError} = this.props;
    const _issue: AnyIssue = issue || issuePlaceholder;
    const readableID: ?string = getReadableID(_issue);
    if (readableID) {
      return (
        <Text
          style={[styles.headerText, _issue?.resolved ? styles.headerTextResolved : null]}
          selectable={true}
          testID="issue-id"
        >
          {readableID}
        </Text>
      );
    }

    return this.isIssueLoaded() ? null : !issueLoadingError && <Skeleton width={120}/> || null;
  }

  _renderHeader() {
    const {
      issue,
      editMode,
      summaryCopy,
      isSavingEditedIssue,
      saveIssueSummaryAndDescriptionChange,
      showIssueActions,
      stopEditingIssue,
      issuePermissions,
      getIssueLinksTitle,
      onLinkIssue,
      loadIssuesXShort,
    } = this.props;

    const issueIdReadable = this.renderHeaderIssueTitle();
    if (!editMode) {
      const isIssueLoaded: boolean = this.isIssueLoaded();
      return (
        <Header
          leftButton={this.renderBackIcon()}
          rightButton={isIssueLoaded ? this.renderActionsIcon(this.uiTheme) : null}
          extraButton={isIssueLoaded ? this.renderStar(this.uiTheme) : null}
          onRightButtonClick={() => {
            if (isIssueLoaded) {
              showIssueActions(
                this.context.actionSheet(),
                {
                  canAttach: issuePermissions.canAddAttachmentTo(issue),
                  canEdit: issuePermissions.canUpdateGeneralInfo(issue),
                  canApplyCommand: issuePermissions.canRunCommand(issue),
                  canTag: issuePermissions.canTag(issue),
                },
                this.switchToDetailsTab,
                (issuePermissions.canLink(issue)
                  ? () => (
                    <LinkedIssuesAddLink
                      onLinkIssue={onLinkIssue}
                      issuesGetter={loadIssuesXShort}
                      onUpdate={(issues?: Array<IssueLink>) => {
                        getIssueLinksTitle(issues);
                      }}
                    />
                  )
                  : null)
              );
            }
          }
          }
          onBack={this.handleOnBack}
        >
          {issueIdReadable}
        </Header>
      );
    } else {
      const canSave: boolean = Boolean(summaryCopy) && !isSavingEditedIssue;
      const linkColor: string = this.uiTheme.colors.$link;
      const textSecondaryColor: string = this.uiTheme.colors.$textSecondary;

      return (
        <Header
          style={styles.header}
          leftButton={
            <IconClose
              size={21}
              color={isSavingEditedIssue ? textSecondaryColor : linkColor}
            />}
          onBack={stopEditingIssue}
          rightButton={<IconCheck size={20} color={canSave ? linkColor : textSecondaryColor}/>}
          onRightButtonClick={canSave ? saveIssueSummaryAndDescriptionChange : () => {}}
        >
          {issueIdReadable}
        </Header>
      );
    }
  }

  _renderRefreshControl(onRefresh?: Function, uiTheme: UITheme) {
    return <RefreshControl
      testID="refresh-control"
      accessibilityLabel="refresh-control"
      accessible={true}
      refreshing={this.props.isRefreshing}
      tintColor={uiTheme.colors.$link}
      onRefresh={() => {
        if (onRefresh) {
          onRefresh();
        }
      }}
    />;
  }

  _renderCommandDialog() {
    const {
      closeCommandDialog,
      commandSuggestions,
      getCommandSuggestions,
      applyCommand,
      commandIsApplying,
      initialCommand,
    } = this.props;

    return <CommandDialog
      suggestions={commandSuggestions}
      onCancel={closeCommandDialog}
      onChange={getCommandSuggestions}
      onApply={applyCommand}
      isApplying={commandIsApplying}
      initialCommand={initialCommand}
      uiTheme={this.uiTheme}
    />;
  }

  renderAttachFileDialog = (): React$Element<typeof AttachFileDialog> => (
    <AttachFileDialog
      hideVisibility={false}
      getVisibilityOptions={() => getApi().issue.getVisibilityOptions(this.props.issueId)}
      actions={{
        onAttach: async (files: Array<NormalizedAttachment>, onAttachingFinish: () => any) => {
          await this.addAttachment(files, onAttachingFinish);
          this.setState({isAttachFileDialogVisible: false});
        },
        onCancel: () => {
          this.cancelAddAttach();
          this.setState({isAttachFileDialogVisible: false});
        },
      }}
    />
  );

  cancelAddAttach = () => {
    const {cancelAddAttach, toggleVisibleAddAttachDialog, attachingImage} = this.props;
    cancelAddAttach(attachingImage);
    toggleVisibleAddAttachDialog(false);
  };

  addAttachment = async (files: Array<NormalizedAttachment>, onAttachingFinish: () => any) => {
    const {uploadIssueAttach, loadAttachments} = this.props;
    await uploadIssueAttach(files);
    onAttachingFinish();
    loadAttachments();
  };

  isIssueLoaded = (): boolean => {
    const {issueLoaded, issueLoadingError} = this.props;
    return Boolean(issueLoaded && !issueLoadingError);
  };

  renderTagsSelect() {
    const {selectProps} = this.props;
    return (
      <Select
        {...selectProps}
        titleRenderer={(tag: Tag) => {
          return (
            <ColorField
              fullText={true}
              text={tag.name}
              color={tag.color}
              style={styles.issueTagSelectItem}
            />
          );
        }}
      />
    );
  }

  render() {
    const {
      issue,
      issueLoadingError,
      showCommandDialog,
      isAttachFileDialogVisible,
      isTagsSelectVisible,
      issuePermissions,
      dispatcher,
    } = this.props;

    return (
      <IssueContext.Provider
        value={{
          issue,
          issuePermissions,
          dispatcher,
        }}
      >
        <ThemeContext.Consumer>
          {(theme: Theme) => {
            this.uiTheme = theme.uiTheme;
            return (
              <View style={styles.container} testID="issue-view">
                {this._renderHeader()}

                {issueLoadingError && <View style={styles.error}><ErrorMessage error={issueLoadingError}/></View>}

                {!issueLoadingError && this.renderTabs(this.uiTheme)}

                {this.isIssueLoaded() && showCommandDialog && this._renderCommandDialog()}

                {isAttachFileDialogVisible && this.renderAttachFileDialog()}

                {isTagsSelectVisible && this.renderTagsSelect()}
              </View>
            );
          }}
        </ThemeContext.Consumer>
      </IssueContext.Provider>
    );
  }
}

type OwnProps = {
  issuePermissions: IssuePermissions,
  issuePlaceholder: $Shape<IssueFull>,
  issueId: string,
  user: User,
  navigateToActivity: ?boolean
};

const mapStateToProps = (state: { app: RootState, issueState: IssueState }, ownProps: OwnProps): IssueState & OwnProps => {
  return ({
    issuePermissions: state.app.issuePermissions,
    ...state.issueState,
    issuePlaceholder: ownProps.issuePlaceholder,
    issueId: ownProps.issueId,
    user: state.app.user,
    navigateToActivity: ownProps.navigateToActivity,
  }: $Shape<IssueState & OwnProps>);
};

const mapDispatchToProps = (dispatch) => {
  return {
    ...bindActionCreators(issueActions, dispatch),
    createAttachActions: () => attachmentActions.createAttachActions(dispatch),
    dispatcher: dispatch,
  };
};

export function connectIssue(Component: any): any {
  return connect(mapStateToProps, mapDispatchToProps)(Component);
}

export default (connectIssue(Issue): React$AbstractComponent<IssueProps, mixed>);

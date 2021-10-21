/* @flow */

import {
  Image,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Linking,
  TouchableWithoutFeedback,
} from 'react-native';
import React, {Component} from 'react';
import Auth from '../../components/auth/auth';
import OAuth2 from '../../components/auth/oauth2';
import Router from '../../components/router/router';
import {connect} from 'react-redux';
import {formatYouTrackURL} from '../../components/config/config';
import {logo, IconBack} from '../../components/icon/icon';
import Keystore from '../../components/keystore/keystore';
import KeyboardSpacer from 'react-native-keyboard-spacer';
import usage from '../../components/usage/usage';
import clicksToShowCounter from '../../components/debug-view/clicks-to-show-counter';
import {openDebugView, applyAuthorization} from '../../actions/app-actions';
import {LOG_IN_2FA_TIP} from '../../components/error-message/error-text-messages';

import {resolveErrorMessage} from '../../components/error/error-resolver';
import ErrorMessageInline from '../../components/error-message/error-message-inline';

import {ThemeContext} from '../../components/theme/theme-context';

import {formStyles} from '../../components/common-styles/form';
import {HIT_SLOP} from '../../components/common-styles/button';
import styles from './log-in.styles';

import type {AppConfig} from '../../flow/AppConfig';
import type {AuthParams, OAuthParams} from '../../flow/Auth';
import type {Node} from 'React';
import type {Theme, UIThemeColors} from '../../flow/Theme';

type Props = {
  config: AppConfig,
  onLogIn: (authParams: AuthParams) => any,
  onShowDebugView: Function,
  onChangeServerUrl: (currentUrl: string) => any
};

type State = {
  username: string,
  password: string,
  errorMessage: string,
  loggingIn: boolean,
  youTrackBackendUrl: string
};

const noop = () => {};
const CATEGORY_NAME = 'Login form';


export class LogIn extends Component<Props, State> {
  passInputRef: any;

  constructor(props: Props) {
    super(props);
    this.state = {
      username: '',
      password: '',
      errorMessage: '',
      loggingIn: false,
      youTrackBackendUrl: props.config.backendUrl,
    };

    const config: AppConfig = props.config;
    Keystore.getInternetCredentials(config.auth.serverUri)
      .then(({username, password}) => this.setState({username, password}), noop);

    this.passInputRef = React.createRef();

    usage.trackScreenView('Login form');
  }

  async componentDidMount(): void {
    if (!this.isConfigHasClientSecret()) {
      await this.logInViaHub();
    }
  }

  isConfigHasClientSecret(): boolean {
    return !!this.props?.config?.auth?.clientSecret;
  }

  focusOnPassword: (() => void) = () => {
    this.passInputRef.current.focus();
  };

  logInViaCredentials: (() => Promise<void> | Promise<any>) = async () => {
    const {config, onLogIn} = this.props;
    const {username, password} = this.state;

    this.setState({loggingIn: true});

    try {
      const authParams: AuthParams = await Auth.obtainTokenByCredentials(username, password, config);
      Keystore.setInternetCredentials(config.auth.serverUri, username, password).catch(noop);
      usage.trackEvent(CATEGORY_NAME, 'Login via credentials', 'Success');

      onLogIn(authParams);
    } catch (err) {
      usage.trackEvent(CATEGORY_NAME, 'Login via credentials', 'Error');
      const errorMessage = err.error_description || err.message;
      this.setState({errorMessage: errorMessage, loggingIn: false});
    }
  }

  changeYouTrackUrl() {
    this.props.onChangeServerUrl(this.props.config.backendUrl);
  }

  async logInViaHub(): Promise<void> | Promise<any> {
    const {config, onLogIn} = this.props;
    try {
      this.setState({loggingIn: true});

      const oauthParams: OAuthParams = await OAuth2.obtainToken(config);

      usage.trackEvent(CATEGORY_NAME, 'Login via browser with PKCE', 'Success');
      onLogIn(oauthParams);
    } catch (err) {
      usage.trackEvent(CATEGORY_NAME, 'Login via browser PKCE', 'Error');
      const errorMessage = await resolveErrorMessage(err);
      this.setState({loggingIn: false, errorMessage: errorMessage});
    }
  }

  render(): Node {
    const {onShowDebugView, config} = this.props;
    const {password, username, loggingIn, errorMessage} = this.state;
    const isLoginWithCreds: boolean = this.isConfigHasClientSecret();

    return (
      <ThemeContext.Consumer>
        {(theme: Theme) => {
          const uiThemeColors: UIThemeColors = theme.uiTheme.colors;
          const hasNoCredentials: boolean = !username && !password;
          return (
            <ScrollView
              contentContainerStyle={styles.scrollContainer}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="on-drag"
            >
              <View style={[styles.container, isLoginWithCreds ? null : styles.loadingContainer]}>
                <View style={styles.backIconButtonContainer}>
                  <TouchableOpacity
                    onPress={() => this.changeYouTrackUrl()}
                    style={styles.backIconButton}
                    testID="back-to-url"
                  >
                    <IconBack/>
                  </TouchableOpacity>
                </View>

                <View style={isLoginWithCreds ? styles.formContent : styles.formContentCenter}>
                  <TouchableWithoutFeedback onPress={() => clicksToShowCounter(onShowDebugView)}>
                    <Image style={styles.logoImage} source={logo}/>
                  </TouchableWithoutFeedback>

                  <TouchableOpacity
                    style={styles.formContentText}
                    onPress={() => this.changeYouTrackUrl()}
                    testID="youtrack-url"
                  >
                    <Text style={styles.title}>Log in to YouTrack</Text>
                    <Text
                      style={styles.hintText}>{formatYouTrackURL(config.backendUrl)}</Text>
                  </TouchableOpacity>

                  {isLoginWithCreds && <TextInput
                    autoCapitalize="none"
                    autoCorrect={false}
                    editable={!loggingIn}
                    testID="login-input"
                    style={styles.inputUser}
                    placeholder="Username or email"
                    placeholderTextColor={uiThemeColors.$icon}
                    returnKeyType="next"
                    underlineColorAndroid="transparent"
                    onSubmitEditing={() => this.focusOnPassword()}
                    value={username}
                    onChangeText={(username: string) => this.setState({username})}
                  />}

                  {isLoginWithCreds && <TextInput
                    ref={this.passInputRef}
                    editable={!loggingIn}
                    testID="password-input"
                    style={styles.inputPass}
                    placeholder="Password"
                    placeholderTextColor={uiThemeColors.$icon}
                    returnKeyType="done"
                    underlineColorAndroid="transparent"
                    value={this.state.password}
                    onSubmitEditing={() => {
                      this.logInViaCredentials();
                    }}
                    secureTextEntry={true}
                    onChangeText={(password: string) => this.setState({password})}/>}

                  {isLoginWithCreds && <TouchableOpacity
                    style={[
                      formStyles.button,
                      (loggingIn || hasNoCredentials) && formStyles.buttonDisabled,
                    ]}
                    disabled={loggingIn || hasNoCredentials}
                    testID="log-in"
                    onPress={this.logInViaCredentials}>
                    <Text
                      style={[formStyles.buttonText, hasNoCredentials && formStyles.buttonTextDisabled]}>
                      Log in
                    </Text>
                    {this.state.loggingIn && <ActivityIndicator style={styles.progressIndicator}/>}
                  </TouchableOpacity>}

                  {!isLoginWithCreds && this.state.loggingIn && <View style={styles.loadingMessage}>
                    <Text>
                      <Text style={styles.title}>
                        Loading issues...
                      </Text>
                      <ActivityIndicator style={styles.loadingMessageIndicator} color={styles.loadingMessageIndicator.color}/>
                    </Text>
                  </View>}

                  {isLoginWithCreds && <Text style={styles.hintText}>
                    {'You need a YouTrack account to use the app.\n By logging in, you agree to the '}
                    <Text
                      style={formStyles.link}
                      onPress={() => Linking.openURL('https://www.jetbrains.com/company/privacy.html')}>
                      Privacy Policy
                    </Text>.
                  </Text>}

                  {Boolean(errorMessage || hasNoCredentials) && (
                    <View style={styles.error}>
                      <ErrorMessageInline
                        error={this.state.errorMessage}
                        tips={LOG_IN_2FA_TIP}
                      />
                    </View>
                  )}
                </View>
                {isLoginWithCreds && <TouchableOpacity
                  hitSlop={HIT_SLOP}
                  style={styles.support}
                  testID="log-in-via-browser"
                  onPress={() => this.logInViaHub()}
                >
                  <Text style={styles.action}>
                    Log in with Browser
                  </Text>
                </TouchableOpacity>}

                <KeyboardSpacer/>
              </View>
            </ScrollView>
          );
        }}
      </ThemeContext.Consumer>
    );
  }
}


const mapStateToProps = (state, ownProps) => {
  return {
    ...ownProps,
  };
};

const mapDispatchToProps = (dispatch, ownProps) => {
  return {
    onChangeServerUrl: youtrackUrl => {
      if (ownProps.onChangeServerUrl) {
        return ownProps.onChangeServerUrl(youtrackUrl);
      }
      Router.EnterServer({serverUrl: youtrackUrl});
    },
    onLogIn: (authParams: AuthParams | OAuthParams) => dispatch(applyAuthorization(authParams)),
    onShowDebugView: () => dispatch(openDebugView()),
  };
};

// Needed to have a possibility to override callback by own props
const mergeProps = (stateProps, dispatchProps) => {
  return {
    ...dispatchProps,
    ...stateProps,
  };
};

export default (connect(mapStateToProps, mapDispatchToProps, mergeProps)(LogIn): any);

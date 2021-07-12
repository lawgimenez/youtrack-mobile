/* @flow */

import React, {useCallback, useEffect, useState} from 'react';
import {View, ActivityIndicator, Text, TouchableOpacity, Linking} from 'react-native';

import Gallery from 'react-native-image-gallery';
import Video from 'react-native-video';
import {SvgFromUri} from 'react-native-svg';

import Header from '../../components/header/header';
import ImageProgress from 'react-native-image-progress';
import Router from '../../components/router/router';
import usage from '../../components/usage/usage';
import {ANALYTICS_PREVIEW_PAGE} from '../../components/analytics/analytics-ids';
import {hasMimeType} from '../../components/mime-type/mime-type';
import {IconClose} from '../../components/icon/icon';
import {IconNoProjectFound} from '../../components/icon/icon-no-found';
import {isAndroidPlatform} from '../../util/util';
import {logEvent} from '../../components/log/log-helper';
import {notify} from '../../components/notification/notification';

import styles from './preview-file.styles';

import type {Attachment} from '../../flow/CustomFields';
import type {Node} from 'React';

type FileSource = {
  id: string,
  uri: string,
  headers: Object,
  mimeType: string,
}

type Props = {
  imageAttachments: Array<Attachment>,
  current: Attachment,
  imageHeaders: ?Object,
  onRemoveImage?: (index: number) => any
}

const isAndroid: boolean = isAndroidPlatform();
const ERROR_MESSAGE: string = 'Cannot load a preview';

type VideoError = {
  error: {
    code: number,
    domain: string,
    localizedDescription: string,
    localizedFailureReason: string,
    localizedRecoverySuggestion: string,
  }
};
const ImagePreview = (props: Props): Node => {
  // eslint-disable-next-line no-unused-vars
  const [index, updateCurrentIndex] = useState(0);
  const [error, updateError] = useState(null);
  const [isLoading, updateIsLoading] = useState(false);

  const closeView = (): void => {Router.pop(true);};

  const getCurrentIndex: (attachment: Attachment) => number = useCallback((attachment: Attachment): number => (
    props.imageAttachments.findIndex(
      (it: Attachment) => it.id === attachment.id) || 0
  ), [props.imageAttachments]);

  useEffect(() => {
    updateError(null);
    updateIsLoading(false);

    if (props.imageAttachments) {
      updateCurrentIndex(getCurrentIndex(props.current));
    }
  }, [getCurrentIndex, props]);

  const renderLoader = (): React$Element<ActivityIndicator> => (
    <ActivityIndicator color={styles.loader.color} style={styles.loader}/>
  );

  const renderImage: ((imageProps: any) => Node) = (imageProps: { source: Attachment }) => {
    const attach: Attachment = imageProps.source && props.imageAttachments[getCurrentIndex(imageProps.source)];
    return hasMimeType.svg(attach)
      ? (<SvgFromUri
        width="100%"
        height="100%"
        uri={attach.url}
      />)
      : (<ImageProgress
        renderIndicator={renderLoader}
        onError={() => notify(ERROR_MESSAGE)}
        {...imageProps}
      />);

  };

  const createSource = (attach: Attachment): { source: FileSource } => ({
    source: {
      id: attach.id,
      uri: attach.url,
      headers: props.imageHeaders,
      mimeType: attach.mimeType,
    },
  });

  const renderVideo = (): React$Element<typeof Video> => {
    usage.trackEvent(ANALYTICS_PREVIEW_PAGE, 'Open video');
    return <Video
      controls={true}
      fullscreen={false}
      headers={props.imageHeaders}
      onLoad={() => updateIsLoading(false)}
      onLoadStart={() => updateIsLoading(true)}
      onReadyForDisplay={() => updateIsLoading(false)}
      onError={(onError: VideoError) => {
        updateIsLoading(false);
        const message: string = (
          onError?.error?.localizedFailureReason || onError?.error?.localizedDescription || ERROR_MESSAGE
        );
        updateError(message);
        logEvent({message, isError: true});
        notify(message);
      }}
      paused={!isAndroid}
      rate={0.0}
      resizeMode="contain"
      source={{uri: props.current.url}}
      style={styles.video}
    />;
  };

  const isImageAttach = (): boolean => !!props.imageAttachments?.length;

  const renderImageGallery = (): React$Element<typeof Gallery> => {
    usage.trackEvent(ANALYTICS_PREVIEW_PAGE, 'Open image');
    return (
      <Gallery
        images={props.imageAttachments.map(createSource)}
        initialPage={getCurrentIndex(props.current)}
        imageComponent={renderImage}
        onPageSelected={updateCurrentIndex}
        pageMargin={1}
      />
    );
  };

  const renderOpenButton = (): React$Element<typeof TouchableOpacity> => {
    usage.trackEvent(ANALYTICS_PREVIEW_PAGE, 'Preview file externally');
    const attach: Attachment = isImageAttach() ? props.imageAttachments[index] : props.current;
    return (
      <TouchableOpacity
        onPress={() => Linking.openURL(attach.url)}
      >
        <Text style={styles.link}>{attach.name}</Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <Header
        leftButton={<IconClose size={21} color={styles.link.color}/>}
        extraButton={!error ? renderOpenButton() : null}
        onBack={closeView}
      />
      {isImageAttach() && renderImageGallery()}

      {!isImageAttach() && renderVideo()}

      {isLoading && renderLoader()}

      {!!error && (
        <View style={[styles.container, styles.error]}>
          <IconNoProjectFound/>
          <Text style={styles.errorTitle}>{error}</Text>
          {renderOpenButton()}
        </View>
      )}
    </View>
  );
};


export default (React.memo<Props>(ImagePreview): React$AbstractComponent<Props, mixed>);
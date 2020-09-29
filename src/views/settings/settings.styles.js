/* @flow */

import EStyleSheet from 'react-native-extended-stylesheet';
import {UNIT} from '../../components/variables/variables';

import {mainText, secondaryText} from '../../components/common-styles/typography';
import {formStyles} from '../../components/common-styles/form';


export default EStyleSheet.create({
  ...formStyles,

  settings: {
    flex: 1,
    backgroundColor: '$background'
  },
  settingsContent: {
    flexGrow: 1,
    paddingLeft: UNIT * 2,
    paddingRight: UNIT * 2,
    flexDirection: 'column'
  },
  settingsOther: {
    flexGrow: 1,
    paddingLeft: UNIT,
    paddingRight: UNIT,
    alignItems: 'center'
  },
  settingsFooter: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: UNIT * 2,
    marginBottom: UNIT * 3
  },
  settingsFooterTitle: {
    ...mainText,
    color: '$text',
    fontSize: 18,
    fontWeight: '500'
  },
  settingsFooterLink: {
    ...mainText,
    color: '$link',
    marginTop: UNIT,
    marginBottom: UNIT,
  },
  settingsFooterBuild: {
    ...secondaryText,
    color: '$icon',
  }
});

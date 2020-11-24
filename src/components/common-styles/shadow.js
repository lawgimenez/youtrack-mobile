import {Platform} from 'react-native';

export const elevation1 = {
  ...Platform.select({
    ios: {
      shadowRadius: 0.75,
      shadowColor: '$separator',
      shadowOffset: {
        width: 0,
        height: 1
      },
      shadowOpacity: 0.9,
    },
    android: {
      elevation: 2,
      borderBottomWidth: 0.3,
      borderColor: '$separator'
    },
  })
};

export const elevationTop = {
  borderTopWidth: 0.6,
  borderColor: '$separator'
};

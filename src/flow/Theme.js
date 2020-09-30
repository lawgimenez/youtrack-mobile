/* @flow */

export type Theme = {
  mode: string,
  uiTheme: UITheme
}

export type BarStyle = 'light-content' | 'dark-content';

export type UIThemeColors = {|
  $background: string,
  $boxBackground: string,

  $error: string,

  $text: string,
  $textSecondary: string,
  $textButton: string,

  $link: string,
  $linkLight: string,

  $disabled: string,
  $border: string,

  $icon: string,
  $iconAccent: string,

  $mask: string,

  $separator: string
|};

export type UITheme = {
  dark: boolean,
  name: string,
  barStyle: BarStyle,

  colors: UIThemeColors
}


export const OFFICE_CHART_COLORS = [
  '#4F81BD',
  '#C0504D',
  '#9BBB59',
  '#8064A2',
  '#4BACC6',
  '#F79646',
  '#1F497D',
  '#953735',
  '#76923C',
  '#604A7B',
  '#31859B',
  '#E36C09'
];

export const OFFICE_STATUS_COLORS = {
  primary: '#4F81BD',
  primaryDark: '#385D8A',
  primarySoft: '#DCE6F2',
  secondary: '#8064A2',
  secondarySoft: '#E6E0EC',
  live: '#9BBB59',
  liveSoft: '#EAF1DD',
  offline: '#C0504D',
  offlineSoft: '#F2DCDB',
  warning: '#F79646',
  warningSoft: '#FDEADA',
  info: '#4BACC6',
  infoSoft: '#DAEEF3',
  neutral: '#7F7F7F',
  neutralSoft: '#EFEFEF'
};

export const getOfficeColor = (index) => OFFICE_CHART_COLORS[index % OFFICE_CHART_COLORS.length];

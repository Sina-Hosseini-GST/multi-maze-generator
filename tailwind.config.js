const plugin = require('tailwindcss/plugin')

module.exports = {
  purge: {
    enabled: true,
    content: ['*.html',
    'js/app.js',],
  },
  darkMode: false, // or 'media' or 'class'
  theme: {
    extend: {
      letterSpacing: {
        c : '0.5em',
      },
      screens: {
        'md1':'500px',
        'lg1':'750px',
        'xl1':'1050px',
        'xl2':'1450px',
        'wmin_h550': {'raw': 'screen and (max-height: 550px)'},
        'wmin_h500': {'raw': 'screen and (max-height: 500px)'},
        'wmin_h400': {'raw': 'screen and (max-height: 400px)'},
        'wmin_h350': {'raw': 'screen and (max-height: 350px)'},
        'wmin_h300': {'raw': 'screen and (max-height: 300px)'},
        'wmin_h260': {'raw': 'screen and (max-height: 260px)'},
        'wmd1_h600': {'raw': 'screen and (min-width: 500px) and (max-height: 600px)'},
        'wmd1_h550': {'raw': 'screen and (min-width: 500px) and (max-height: 550px)'},
        'wmd1_h500': {'raw': 'screen and (min-width: 500px) and (max-height: 500px)'},
        'wmd1_h450': {'raw': 'screen and (min-width: 500px) and (max-height: 450px)'},
        'wmd1_h400': {'raw': 'screen and (min-width: 500px) and (max-height: 400px)'},
        'wmd1_h350': {'raw': 'screen and (min-width: 500px) and (max-height: 350px)'},
        'wmd1_h300': {'raw': 'screen and (min-width: 500px) and (max-height: 300px)'},
        'wmd1_h260': {'raw': 'screen and (min-width: 500px) and (max-height: 260px)'},
        'wlg1_h550': {'raw': 'screen and (min-width: 750px) and (max-height: 550px)'},
        'wlg1_h500': {'raw': 'screen and (min-width: 750px) and (max-height: 500px)'},
        'wlg1_h450': {'raw': 'screen and (min-width: 750px) and (max-height: 450px)'},
        'wlg1_h400': {'raw': 'screen and (min-width: 750px) and (max-height: 400px)'},
        'wlg1_h350': {'raw': 'screen and (min-width: 750px) and (max-height: 350px)'},
        'wlg1_h300': {'raw': 'screen and (min-width: 750px) and (max-height: 300px)'},
      },
      inset: {
       'c':'calc(20% + 2rem)',
       '2.2': '0.55rem',
       '2.75': '0.6875rem',
       '3.25': '0.8125rem',
       '4.375': '1.09375rem',
       '3.625': '0.90625rem',
       '2.875': '0.71875rem',
       '1/5': '20%',
      },
      fontSize: {
        'dxls':['0.45rem', {
        }],
        'xls':['0.5rem', {
        }],
        'c-xs':['0.65rem', {
        }],
        'c-sm':['0.8125rem', {
        }],
        'c': ['10rem', {
        }],
        'c-2': ['15rem', {
        }],
        'c-3': ['3.25rem', {
        }],
        'c-xl': ['1.25rem', {
          lineHeight: '2.125rem',
        }],
        'c-xl-2': ['1.25rem', {
          lineHeight: '1.75rem',
        }],
        'c-xl-3': ['1.25rem', {
          lineHeight: '1.5rem',
        }],
        'c-1.5xl': ['1.375rem', {
          lineHeight: '1.875rem',
        }],
        'c-2xl': ['1.5rem', {
          lineHeight: '2.15rem',
        }],
      },
      borderWidth: {
       '3': '3px',
      },
      width:{
        '18':'4.5rem',
        '15':'3.75rem',
        '22': '5.5rem',
        '30': '7.5rem',
        '66': '16.5rem',
        '72': '18rem',
        '88': '22rem',
        '100': '25rem',
        '104': '26rem',
        '120': '30rem',
        '128': '32rem',
        '136': '34rem',
        '140': '35rem',
        '152': '38rem',
        '192': '48rem',
        '12.5/100':'12.5%',
        '15/100':'15%',
        '22.5/100':'22.5%',
        '9/10':'90%',
        '150/100':'150%',
        '250/100':'250%',
        '40vw':'40vw',
      },
      height:{
        '6.2': '1.55rem',
        '18': '4.5rem',
        '22': '5.5rem',
        '30': '7.5rem',
        '67':'16.75rem',
        '81.6':'20.4rem',
        '82':'20.5rem',
      },
      fontFamily: { 
        'anders': ['anders', 'sans-serif'],
        'reflee': ['reflee', 'sans-serif'],
        'biysk': ['biysk', 'sans-serif'],
      },
      colors: {
        'c-brown':'#E05E00',
        'c-orange':'#ffbb00',
        'c-red':'#c50000',
        'c-red-2':'#ff0038',
        'c-red-3':'#ff1f1f',
        'c-red-4':'#cc0026',
        'c-gray':'#f9f9f9',
        'c-gray-2':'#919191',
        'c-gray-3':'#f3f3f3',
        'c-gray-4':'#2d2d2d',
        'c-gray-5':'#eeeeee',
        'c-gray-6':'#EDEDED',
        'c-gray-7':'#454545',
        'c-blue':'#02001a',
        'c-blue-2':'#0085ff',
        'c-green':'#00503b',
        'c-green-2':'#00fc54',
        'c-purple':'#800041',
        'pure-yellow':'yellow',
      },
      boxShadow: {
        c: '5px 5px #8b8b8b',
      },
      margin:{
        '0.25': '0.0625rem',
        '0.75': '0.1875rem',
      },
      transitionProperty: {
       'top':'top',
       'right':'right',
       'bottom':'bottom',
       'margin': 'margin',
       'height':'height',
       'width':'width',
       'textShadow':'text-shadow',
       'c': 'opacity, transform',
       'inset':'inset',
      },
      textShadow: {
        'c': '5px -5px 0px white',
      },
    },
  },
  variants: {
    borderColor: ({ after }) => after(['first-letter']),
    borderWidth: ({ after }) => after(['first-letter']),
    borderStyle: ({ after }) => after(['first-letter']),
    padding: ({ after }) => after(['first-letter']),
    backgroundColor: ({ after }) => after(['first-letter']),
    textColor: ({ after }) => after(['first-letter']),
    fontSize: ({ after }) => after(['first-letter']),
    fontWeight: ({ after }) => after(['first-letter']),
    textDecoration: ({ after }) => after(['first-letter']),
    textShadow: ({ after }) => after(['first-letter']),
    extend: {
      margin: ['hover','group-hover'],
      display: ['hover', 'focus'],
      fontSize:['responsive'],
      fontWeight: ['responsive'],
    },
  },
  plugins: [
    require('tailwindcss-dir')(),
    require('tailwindcss-rtl'),
    require('tailwindcss-textshadow'),
    plugin(function ({ addVariant, e }) {
      addVariant('first-letter', ({ modifySelectors, separator }) => {
        modifySelectors(({ className }) => {
          return `.${e(`first-letter${separator}${className}`)}:first-letter`
        })
      })
    }),
  ],
}

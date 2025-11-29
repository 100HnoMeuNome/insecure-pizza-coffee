/**
 * Social Media Integration Configuration
 * WARNING: This file contains hardcoded secrets for testing Datadog Secret Scanning
 * DO NOT use in production!
 */

const socialMediaConfig = {
  facebook: {
    icon: '📘',
    name: 'Facebook',
    // Facebook Access Token - matches pattern: EAACEdEose0cBA + alphanumeric characters
    accessToken: 'EAACEdEose0cBAcsAw7uoeXTceg7PduPwcl9m0DbBN',
    appId: '123456789',
    appSecret: 'your-facebook-app-secret',
    enabled: true
  },

  linkedin: {
    icon: '💼',
    name: 'LinkedIn',
    // LinkedIn Secret - 16 lowercase alphanumeric characters
    clientSecret: 'venrnawe6infuo8o',
    clientId: 'your-linkedin-client-id',
    enabled: true
  },

  twitter: {
    icon: '🐦',
    name: 'Twitter',
    // Twitter Access Token - numeric + hyphen + 40 alphanumeric chars
    accessToken: '123456-venrnawe6INFuo8o2u8sllzljolydmdp7szl0yfy',
    // Alternative format: 45 alphanumeric characters
    accessTokenAlt: 'venrnawe6infuo8o2u8sllzljolydmdp7szl0yfyABCDE',
    consumerKey: 'your-twitter-consumer-key',
    consumerSecret: 'your-twitter-consumer-secret',
    enabled: true
  }
};

// Social media posting function
function postToSocialMedia(platform, message) {
  const config = socialMediaConfig[platform];

  if (!config || !config.enabled) {
    console.error(`${platform} integration is not enabled`);
    return false;
  }

  console.log(`${config.icon} Posting to ${config.name}: "${message}"`);

  // Simulated API calls with hardcoded tokens
  switch(platform) {
    case 'facebook':
      return postToFacebook(message, config.accessToken);
    case 'linkedin':
      return postToLinkedIn(message, config.clientSecret);
    case 'twitter':
      return postToTwitter(message, config.accessToken);
    default:
      return false;
  }
}

function postToFacebook(message, token) {
  // Facebook Graph API call simulation
  console.log(`Using token: ${token}`);
  return true;
}

function postToLinkedIn(message, secret) {
  // LinkedIn API call simulation
  console.log(`Using secret: ${secret}`);
  return true;
}

function postToTwitter(message, token) {
  // Twitter API call simulation
  console.log(`Using token: ${token}`);
  return true;
}

module.exports = {
  socialMediaConfig,
  postToSocialMedia
};

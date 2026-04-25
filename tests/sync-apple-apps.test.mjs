import assert from 'node:assert/strict';
import { parseAppStorePageMedia } from '../scripts/sync-apple-apps.mjs';

const serializedData = {
    data: [
        {
            data: {
                lockup: {
                    icon: {
                        template: 'https://is1-ssl.mzstatic.com/image/thumb/Purple211/v4/app-icon/AppIcon.png/{w}x{h}{c}.{f}'
                    }
                },
                shelfMapping: {
                    product_media_phone_: {
                        items: [
                            {
                                screenshot: {
                                    template: 'https://is1-ssl.mzstatic.com/image/thumb/PurpleSource221/v4/latest-one/ScreenOne.png/{w}x{h}{c}.{f}',
                                    width: 1284,
                                    height: 2778,
                                    crop: 'bb'
                                }
                            },
                            {
                                screenshot: {
                                    template: 'https://is1-ssl.mzstatic.com/image/thumb/PurpleSource211/v4/latest-two/ScreenTwo.png/{w}x{h}{c}.{f}',
                                    width: 1284,
                                    height: 2778,
                                    crop: 'bb'
                                }
                            }
                        ]
                    }
                }
            }
        }
    ],
    userTokenHash: ''
};

const html = `
<!doctype html>
<html>
<body>
<script type="application/json" id="serialized-server-data">${JSON.stringify(serializedData)}</script>
</body>
</html>
`;

const media = parseAppStorePageMedia(html);

assert.equal(
    media.artworkUrl512,
    'https://is1-ssl.mzstatic.com/image/thumb/Purple211/v4/app-icon/AppIcon.png/512x512bb.jpg'
);
assert.deepEqual(media.screenshotUrls, [
    'https://is1-ssl.mzstatic.com/image/thumb/PurpleSource221/v4/latest-one/ScreenOne.png/392x848bb.jpg',
    'https://is1-ssl.mzstatic.com/image/thumb/PurpleSource211/v4/latest-two/ScreenTwo.png/392x848bb.jpg'
]);

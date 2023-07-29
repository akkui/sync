const XMLHttpRequest = require("xhr2");

exports.checkURL = async (url) => {
    return new Promise((resolve) => {
        let extract_url = "";
        try { extract_url = url.match(/(?<=watch\?v=)[\w-]+/)[0]; } catch (err) { resolve({ exists: false, duration: 0, url: "" }); };

        var getJSON = function (url, callback) {
            var xhr = new XMLHttpRequest(); xhr.open("GET", url, true); xhr.responseType = "json";
            xhr.onload = function () { var status = xhr.status; if (status === 200) { callback(null, xhr.response); } else { callback(status, xhr.response); } }; xhr.send();
        };

        getJSON(`https://www.googleapis.com/youtube/v3/videos?id=${extract_url}&part=contentDetails,snippet&key=${process.env.youtube_api}`, async function (err, data) {
            try {
                function convertVideoDuration(time) { const regex = /PT((\d+)H)?((\d+)M)?((\d+)S)?/; const match = time.match(regex);
                return parseInt(match[2] || 0) * 3600 + parseInt(match[4] || 0) * 60 + parseInt(match[6] || 0); }
                resolve({ exists: true, title: data.items[0].snippet.title, url: extract_url, duration: convertVideoDuration(data.items[0].contentDetails.duration) });
            } catch (err) {
                resolve({ exists: false, title: "", url: "", duration: 0,  });
            };
        });
    });
};

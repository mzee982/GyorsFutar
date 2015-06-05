function formatTimeDiff(date1, date2) {
    var diffTimeMillis = date1 - date2;
    var diffTimeMillisSign = diffTimeMillis >= 0 ? 1 : -1;

    diffTimeMillis = Math.abs(diffTimeMillis);

    var secs = Math.round(diffTimeMillis / 1000) % 60;
    var minutes = Math.round(diffTimeMillis / 1000 / 60) % 60;
    var hours = Math.round(diffTimeMillis / 1000 / 60 / 60) % 24;

    var secsString = ("00" + secs).slice(-2);
    var minutesString = ("00" + minutes).slice(-2);
    var hoursString = ("00" + hours).slice(-2);
    var signString = diffTimeMillisSign < 0 ? '-' : '';

    var formattedDiffTime =
            signString +
            ((hours > 0) ? (hoursString + ':') : ('')) +
            minutesString + ':' +
            secsString;

    return formattedDiffTime;
}

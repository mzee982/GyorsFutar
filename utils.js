function formatTimeDiff(date1, date2) {
    var diffTimeMillis = date1 - date2;
    var diffTimeMillisSign = diffTimeMillis >= 0 ? 1 : -1;

    diffTimeMillis = Math.abs(diffTimeMillis);

    var secs = Math.floor(diffTimeMillis / 1000) % 60;
    var minutes = Math.floor(diffTimeMillis / 1000 / 60) % 60;
    var hours = Math.floor(diffTimeMillis / 1000 / 60 / 60) % 24;

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

function compareRouteNames(a, b) {
    var aAsNumber = Number(a);
    var bAsNumber = Number(b);
    var aAsString = String(a);
    var bAsString = String(b);
    var aIsNumber = !isNaN(aAsNumber);
    var bIsNumber = !isNaN(bAsNumber);
    var ret = undefined;

    // Compare as numbers
    if (aIsNumber && bIsNumber) {
        ret = a - b;
    }

    // Try prefix
    else if (aIsNumber || bIsNumber) {
        ret = 0;

        // Try prefix
        if (aIsNumber && bAsString.length > 1) {
            var prefix = bAsString.slice(0, -1);
            ret = compareRouteNames(aAsNumber, prefix);
        }

        // Try prefix
        else if (bIsNumber && aAsString.length > 1) {
            var prefix = aAsString.slice(0, -1);
            ret = compareRouteNames(prefix, bAsNumber);
        }

        // Numbers comes first
        if (ret == 0) {
            ret = Number(!aIsNumber) - Number(!bIsNumber);
        }

    }

    // Compare as strings
    else  {
        ret = 0;

        // Try prefixes
        if ((aAsString.length > 1) && (bAsString.length > 1)) {
            var aPrefix = aAsString.slice(0, -1);
            var bPrefix = bAsString.slice(0, -1);

            ret = compareRouteNames(aPrefix, bPrefix);
        }

        // As strings
        if (ret == 0) {
            ret = aAsString.localeCompare(bAsString);
        }
    }

    return ret;
}

function compareRouteGroups(a, b) {
    var aHasTrips = (a.tripLeft != undefined) || (a.tripRight != undefined);
    var bHasTrips = (b.tripLeft != undefined) || (b.tripRight != undefined);
    var ret = undefined;

    // RouteGroups with Trips first
    ret = Number(!aHasTrips) - Number(!bHasTrips);

    // Order by minDistance
    if (ret == 0) {
        ret = a.minDistance - b.minDistance;
    }

    return ret;
}

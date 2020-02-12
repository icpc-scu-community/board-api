module.exports = {
  parseVerdict: verdict => {
    const v = verdict.trim().toLowerCase();
    if (v === 'accepted') return 'AC';
    else if (v.indexOf('wrong answer') !== -1) return 'WA';
    else if (v.indexOf('time limit') !== -1) return 'TLE';
    else if (v.indexOf('memory limit') !== -1) return 'MLE';
    else if (v.indexOf('runtime error') !== -1) return 'RTE';
    else if (v.indexOf('compilation') !== -1) return 'CE';
    else return 'OTHERS';
  }
};

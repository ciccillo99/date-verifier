pragma circom 2.1.5;

include "circomlib/circuits/comparators.circom";

template MonthLookup() {
    signal input packedMonth;
    signal output monthNumber;

    // Definisci i segnali per ciascun mese
    signal isJan, isFeb, isMar, isApr, isMay, isJun, isJul, isAug, isSep, isOct, isNov, isDec;

    // Istanzia i componenti IsEqual per ciascun mese (valori invertiti)
    component eqJan = IsEqual();
    eqJan.in[0] <== packedMonth;
    eqJan.in[1] <== 7231854; // "naJ" (ASCII: [110, 97, 74])
    isJan <== eqJan.out;

    component eqFeb = IsEqual();
    eqFeb.in[0] <== packedMonth;
    eqFeb.in[1] <== 6451822; // "beF" (ASCII: [98, 101, 70])
    isFeb <== eqFeb.out;

    component eqMar = IsEqual();
    eqMar.in[0] <== packedMonth;
    eqMar.in[1] <== 7566957; // "raM" (ASCII: [114, 97, 77])
    isMar <== eqMar.out;

    component eqApr = IsEqual();
    eqApr.in[0] <== packedMonth;
    eqApr.in[1] <== 7498081; // "rpA" (ASCII: [114, 112, 65])
    isApr <== eqApr.out;

    component eqMay = IsEqual();
    eqMay.in[0] <== packedMonth;
    eqMay.in[1] <== 7955813; // "yaM" (ASCII: [121, 97, 77])
    isMay <== eqMay.out;

    component eqJun = IsEqual();
    eqJun.in[0] <== packedMonth;
    eqJun.in[1] <== 7231860; // "nuJ" (ASCII: [110, 117, 74])
    isJun <== eqJun.out;

    component eqJul = IsEqual();
    eqJul.in[0] <== packedMonth;
    eqJul.in[1] <== 7106340; // "luJ" (ASCII: [108, 117, 74])
    isJul <== eqJul.out;

    component eqAug = IsEqual();
    eqAug.in[0] <== packedMonth;
    eqAug.in[1] <== 6777697; // "guA" (ASCII: [103, 117, 65])
    isAug <== eqAug.out;

    component eqSep = IsEqual();
    eqSep.in[0] <== packedMonth;
    eqSep.in[1] <== 7363427; // "peS" (ASCII: [112, 101, 83])
    isSep <== eqSep.out;

    component eqOct = IsEqual();
    eqOct.in[0] <== packedMonth;
    eqOct.in[1] <== 7767935; // "tcO" (ASCII: [116, 99, 79])
    isOct <== eqOct.out;

    component eqNov = IsEqual();
    eqNov.in[0] <== packedMonth;
    eqNov.in[1] <== 7768158; // "voN" (ASCII: [118, 111, 78])
    isNov <== eqNov.out;

    component eqDec = IsEqual();
    eqDec.in[0] <== packedMonth;
    eqDec.in[1] <== 6513124; // "ceD" (ASCII: [99, 101, 68])
    isDec <== eqDec.out;

    // Calcola il numero del mese sommando i prodotti delle corrispondenze
    monthNumber <== isJan * 1
                 + isFeb * 2
                 + isMar * 3
                 + isApr * 4
                 + isMay * 5
                 + isJun * 6
                 + isJul * 7
                 + isAug * 8
                 + isSep * 9
                 + isOct * 10
                 + isNov * 11
                 + isDec * 12;
}

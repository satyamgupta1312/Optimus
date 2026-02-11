// Node 22 has built-in fetch, no import needed

const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbytsbTHOLaFnoVPaoHbFcdjBD9PCDNgtsdrRA3P5N4Uc3k_OtqrkvbGmJuKjOMMeNDdkg/exec';

async function runDebug() {
    console.log('1. Fetching requests...');

    try {
        const response = await fetch(SCRIPT_URL);
        const requests = await response.json();

        console.log(`   Found ${requests.length} requests.`);

        // Find Pending Request for Satyam
        const pending = requests.find(r =>
            (r.status === 'PENDING' || r.status === 'Pending') &&
            r.user.includes('satyam.gupta')
        );

        if (!pending) {
            console.log('   ❌ No PENDING request found for satyam.gupta');
            console.log('   Dumping all statuses:', requests.map(r => `${r.id}: ${r.status}`).join(', '));
            return;
        }

        console.log(`2. Found target request: ${pending.id} (${pending.type})`);
        console.log('   Widgets:', JSON.stringify(pending.widgets, null, 2));

        console.log('3. Triggering APPROVE action...');

        const payload = {
            action: 'approve',
            id: pending.id,
            widgets: pending.widgets,
            headerWidgets: pending.headerWidgets
        };

        const approveResp = await fetch(SCRIPT_URL, {
            method: 'POST',
            body: JSON.stringify(payload)
        });

        const result = await approveResp.json();

        console.log('============================================');
        console.log('APPROVAL RESULT:');
        console.log(JSON.stringify(result, null, 2));
        console.log('============================================');

        if (!result.success && result.errors) {
            console.log('\n❌ DETAILED ERRORS:');
            result.errors.forEach(e => {
                console.log(`   Widget: ${e.widget}`);
                console.log(`   Error:  ${e.error}`);
            });
        }

    } catch (e) {
        console.error('❌ Script Failed:', e);
    }
}

runDebug();

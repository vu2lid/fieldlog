export function HelpView() {
  return (
    <section className="panel help-content" aria-labelledby="help-heading">
      <h2 id="help-heading">Help</h2>
      <p>
        FieldLog is an offline amateur radio logging app for field operations (POTA, SOTA, contests,
        portable). All data stays on your device.
      </p>

      <h3>Quick start</h3>
      <ol>
        <li>Set your station callsign, operator, and grid on the Session tab.</li>
        <li>Choose band and mode — they persist between QSOs.</li>
        <li>On the Log tab, enter a callsign and press Enter or click Log QSO.</li>
        <li>Export your log as ADIF when done; upload to LoTW, Club Log, or POTA later.</li>
      </ol>

      <h3>Keyboard shortcuts</h3>
      <ul>
        <li>
          <kbd>Enter</kbd> — Log QSO from the entry form
        </li>
        <li>
          <kbd>Tab</kbd> — Move between fields in tab order
        </li>
      </ul>

      <h3>ADIF fields used</h3>
      <p>Each QSO exports these ADIF 3.1.7 fields:</p>
      <ul>
        <li>Core: CALL, QSO_DATE, TIME_ON, BAND, FREQ, MODE, RST_SENT, RST_RCVD</li>
        <li>Common: NAME, GRIDSQUARE, COMMENT, STATION_CALLSIGN, OPERATOR, MY_GRIDSQUARE</li>
        <li>
          POTA/SOTA: MY_SIG, MY_SIG_INFO, SIG, SIG_INFO, POTA_REF, MY_POTA_REF, SOTA_REF,
          MY_SOTA_REF
        </li>
        <li>Contest: CONTEST_ID, STX, SRX, STX_STRING, SRX_STRING (when present)</li>
      </ul>

      <h3>Import / export</h3>
      <p>
        Import accepts ADIF 1.x through 3.1.x .adi files. Export always writes ADIF 3.1.7 with a
        standard header. Duplicate QSOs (same call, date, time, band, mode, freq) are skipped on
        merge.
      </p>

      <h3>Offline &amp; privacy</h3>
      <ul>
        <li>No accounts, no cloud sync, no network requests after install.</li>
        <li>Data is stored in IndexedDB in your browser.</li>
        <li>Install via Add to Home Screen for offline PWA use.</li>
        <li>
          Content-Security-Policy blocks all external connections — verify in DevTools Network tab.
        </li>
      </ul>

      <h3>Duplicate detection</h3>
      <p>
        When entering a callsign, FieldLog shows a DUPE badge if that station was worked before.
        Configure whether dupes match same band+mode or any band in Session settings.
      </p>
    </section>
  );
}

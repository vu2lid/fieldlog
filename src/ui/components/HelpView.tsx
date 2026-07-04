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
        <li>
          Name, grid, P2P refs, and comment are under <strong>More fields</strong> — collapsed
          on phones so the Log button stays on screen.
        </li>
        <li>Export your log as ADIF when done; upload to LoTW, Club Log, or POTA later.</li>
      </ol>

      <h3>Log table columns</h3>
      <p>
        The <strong>Highlights</strong> checkbox above the log table (on by default) shows only
        the key columns — Call, Time, Band, Mode — so the table fits phone screens without
        sideways scrolling. Uncheck it to see all columns (date, frequency, RST). Your choice is
        remembered on this device; every field is always visible when editing a QSO.
      </p>

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
        merge. When the log table has an active filter (callsign, band, mode, or date range), the
        Import/Export tab offers exporting just that filtered subset.
      </p>

      <h3>Session counter</h3>
      <p>
        The Session tab shows QSOs logged in the current session — press New session at the start
        of an activation to reset the counter without touching the log.
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

      <h3>Night operation</h3>
      <p>
        The Red night mode button in the header switches to a low-intensity red-on-black theme
        that preserves night vision. Your choice is remembered on this device.
      </p>
    </section>
  );
}

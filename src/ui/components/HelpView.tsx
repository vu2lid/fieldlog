import { APP_VERSION } from '../../core/version';

export function HelpView() {
  return (
    <section className="panel help-content" aria-labelledby="help-heading">
      <h2 id="help-heading">Help</h2>
      <p className="app-version">FieldLog v{APP_VERSION}</p>
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
          Invalid required values must be fixed before logging. Unusual but potentially valid values
          show a warning and can be accepted with <strong>Log anyway</strong>.
        </li>
        <li>
          Name, grid, P2P refs, and comment are under <strong>More fields</strong> — collapsed on
          phones so the Log button stays on screen.
        </li>
        <li>Export your log as ADIF when done; upload to LoTW, Club Log, or POTA later.</li>
      </ol>

      <h3>Log table columns</h3>
      <p>
        The <strong>Highlights</strong> checkbox above the log table (on by default) shows only the
        key columns — Call, Date, Time, Band, Mode — so the table fits phone screens without
        sideways scrolling. Uncheck it to see frequency, RST, and the Edit/Delete actions. Your
        choice is remembered on this device.
      </p>

      <h3>Editing a QSO</h3>
      <p>
        Uncheck Highlights and choose Edit to correct core, contact, station, POTA/SOTA, signal, and
        contest fields. Invalid values must be fixed; unusual values can be explicitly accepted.
        Unknown fields preserved from imported ADIF remain unchanged when you save.
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
        standard header. Selecting a file first shows a preview of valid records, invalid records,
        duplicates, validation warnings, and parser warnings. Nothing is written until you confirm;
        valid records then merge in one transaction. Duplicate QSOs (same call, date, time, band,
        mode, freq) are skipped. When the log table has an active filter (callsign, band, mode, or
        date range), the Import/Export tab offers exporting just that filtered subset.
      </p>

      <h3>Backup reminders</h3>
      <p>
        FieldLog can recommend a full ADIF export after a configurable QSO-count difference or
        elapsed time while the log has changed. A full export marks the backup status current;
        filtered exports do not. The reminder is non-blocking and can be dismissed until the log
        changes again. Browsers report that the download started, but cannot confirm where the file
        was ultimately saved.
      </p>

      <h3>Session counter</h3>
      <p>
        The Session tab shows QSOs logged in the current session — press New session at the start of
        an activation to reset the counter without touching the log.
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

      <h3>Install FieldLog</h3>
      <p>
        When <strong>Install app</strong> appears in the FieldLog header, select it and confirm the
        browser prompt. Chromium browsers also show an install icon in the address bar. On Safari,
        use Share and then Add to Home Screen. The install control is hidden when FieldLog is
        already running as an installed app.
      </p>
      <p>
        To remove FieldLog, open the installed app&apos;s menu and choose{' '}
        <strong>Uninstall FieldLog</strong>, or remove it through your browser or operating-system
        app settings. Export your log before uninstalling.
      </p>
      <p>
        Uninstalling the app and deleting its local log are separate actions. Uninstalling may leave
        the log in browser storage. To erase it permanently, clear FieldLog&apos;s site data in
        browser settings. This cannot be undone.
      </p>

      <h3>Duplicate detection</h3>
      <p>
        When entering a callsign, FieldLog shows a DUPE badge if that station was worked before.
        Configure whether dupes match same band+mode or any band in Session settings.
      </p>

      <h3>Display themes</h3>
      <p>
        Use the Theme selector in the header for bright daylight, general low-light, or Red Night
        operation. Red Night uses a low-intensity red-on-black palette to preserve night vision.
        Your choice is remembered on this device.
      </p>
    </section>
  );
}

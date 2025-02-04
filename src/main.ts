import './style.css';
import './FeedbackWidget';

document.querySelector<HTMLDivElement>('#app')!.innerHTML = `
  <div class="container">
    <h1>Feedback Widget Test Page</h1>
    
    <div class="sections-wrapper">
      <section class="test-section">
        <h2>Text Elements</h2>
        <p>This is a regular paragraph with some <strong>bold text</strong> and <em>italic text</em>.</p>
        <p>Here's a paragraph with a <a href="#">link</a> in it.</p>
        
        <h3>Lists</h3>
        <ul>
          <li>Unordered list item 1</li>
          <li>Unordered list item 2</li>
          <li>Unordered list item 3</li>
        </ul>
        
        <ol>
          <li>Ordered list item 1</li>
          <li>Ordered list item 2</li>
          <li>Ordered list item 3</li>
        </ol>
      </section>

      <section class="test-section">
        <h2>Form Elements</h2>
        <form>
          <div class="form-group">
            <label for="text-input">Text Input:</label>
            <input type="text" id="text-input" placeholder="Enter some text">
          </div>
          
          <div class="form-group">
            <label for="select-input">Select Dropdown:</label>
            <select id="select-input">
              <option>Option 1</option>
              <option>Option 2</option>
              <option>Option 3</option>
            </select>
          </div>

          <div class="form-group">
            <label>
              <input type="checkbox"> Checkbox option
            </label>
          </div>

          <div class="form-group">
            <label>
              <input type="radio" name="radio-group"> Radio option 1
            </label>
            <label>
              <input type="radio" name="radio-group"> Radio option 2
            </label>
          </div>

          <div class="form-group">
            <label for="textarea">Textarea:</label>
            <textarea id="textarea" rows="4" placeholder="Enter multiple lines of text"></textarea>
          </div>

          <button type="button">Regular Button</button>
        </form>
      </section>

      <section class="test-section">
        <h2>Table Example</h2>
        <table>
          <thead>
            <tr>
              <th>Header 1</th>
              <th>Header 2</th>
              <th>Header 3</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Row 1, Cell 1</td>
              <td>Row 1, Cell 2</td>
              <td>Row 1, Cell 3</td>
            </tr>
            <tr>
              <td>Row 2, Cell 1</td>
              <td>Row 2, Cell 2</td>
              <td>Row 2, Cell 3</td>
            </tr>
          </tbody>
        </table>
      </section>
    </div>

    <feedback-widget></feedback-widget>
  </div>
`;

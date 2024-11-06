import { Component } from '@angular/core';
import { SearchFormComponent } from './search-form/search-form.component';

@Component({
  selector: 'app-root',
  standalone: true,
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css'],
  imports: [SearchFormComponent] // 导入 Standalone 组件
})
export class AppComponent {
  title = 'my-angular-app';
}

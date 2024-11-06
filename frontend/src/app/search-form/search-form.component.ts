// search-form.component.ts
import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { debounceTime, switchMap, catchError, map } from 'rxjs/operators';
import { CommonModule } from '@angular/common';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatOptionModule } from '@angular/material/core';
import { FormsModule } from '@angular/forms';  // 保留导入，如果不再使用 [(ngModel)] 可以移除
import { MatCheckboxModule } from '@angular/material/checkbox'; // 添加 MatCheckboxModule
import { MatSelectModule } from '@angular/material/select'; // 添加 MatSelectModule
import { MatButtonModule } from '@angular/material/button'; // 添加 MatButtonModule

@Component({
  selector: 'app-search-form',
  standalone: true,
  templateUrl: './search-form.component.html',
  styleUrls: ['./search-form.component.css'],
  imports: [
    ReactiveFormsModule,
    // FormsModule,  // 如果不再使用 [(ngModel)]，可以移除
    MatAutocompleteModule,
    MatFormFieldModule,
    MatInputModule,
    MatOptionModule,
    MatCheckboxModule,
    MatSelectModule,
    MatButtonModule,
    CommonModule
  ]
})
export class SearchFormComponent implements OnInit {
  searchForm: FormGroup;
  cityOptions: { city: string; state: string }[] = [];

  states: string[] = [
    'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA', 'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME',
    'MD', 'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ', 'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA',
    'RI', 'SC', 'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY'
  ];

  private readonly API_KEY = 'AIzaSyCXW5z1VlxxIPn3yuNBWN3jF2PqokEE5O8';
  private readonly API_URL = 'https://maps.googleapis.com/maps/api/place/autocomplete/json';

  constructor(private fb: FormBuilder, private http: HttpClient) {
    this.searchForm = this.fb.group({
      street: [{ value: '', disabled: false }, Validators.required],
      city: [{ value: '', disabled: false }, Validators.required],
      state: [{ value: '', disabled: false }, Validators.required],
      useCurrentLocation: [false] // 添加复选框控制
    });
  }

  ngOnInit() {
    // 订阅 'city' 字段的值变化
    this.searchForm.get('city')?.valueChanges
      .pipe(
        debounceTime(300),
        switchMap(input => this.getCityAutocomplete(input || ''))
      )
      .subscribe((options) => {
        this.cityOptions = options || [];
      });

    // 订阅 'useCurrentLocation' 字段的值变化
    this.searchForm.get('useCurrentLocation')?.valueChanges
      .subscribe((checked: boolean) => {
        this.onLocationToggle(checked);
      });
  }

  getCityAutocomplete(input: string): Observable<{ city: string; state: string }[]> {
    if (!input) return of([]);
    const url = `/api/autocomplete?input=${input}`;
    return this.http.get<any>(url).pipe(
      map((response) => {
        if (!response.predictions) return [];
        return response.predictions.map((prediction: any) => {
          const terms = prediction.terms;
          const city = terms[0]?.value;
          const state = terms[1]?.value;
          return { city, state };
        });
      }),
      catchError(() => of([]))
    );
  }

  onLocationToggle(checked: boolean = false) {
    if (checked) {
      this.searchForm.get('street')?.disable();
      this.searchForm.get('city')?.disable();
      this.searchForm.get('state')?.disable();
    } else {
      this.searchForm.get('street')?.enable();
      this.searchForm.get('city')?.enable();
      this.searchForm.get('state')?.enable();
    }
  }

  onCitySelected(option: { city: string; state: string }) {
    this.searchForm.get('city')?.setValue(option.city);
    this.searchForm.get('state')?.setValue(option.state);
  }

  onSearch() {
    if (this.searchForm.valid) {
      console.log('Search Form Data:', this.searchForm.value);
      // 在这里添加您的搜索逻辑
    }
  }

  onClear() {
    this.searchForm.reset();
    this.onLocationToggle(false);
  }
}
